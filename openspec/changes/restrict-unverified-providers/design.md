## Context

See `proposal.md` - Why. Two independent but related gaps exist today, both because
`verification_status` is currently advisory-only:

- `ProviderRepository.List` builds an `IS NULL OR verificationStatus = :verificationStatus`
  clause straight from whatever the public `GET /providers` caller passed in
  `ListProvidersQueryDto.verificationStatus` — omit it (or pass any status) and every provider
  matches.
- `ProviderCategoryRepository.ListCategoryIdsForOwner` resolves a provider owner's serviced
  category ids with no verification-status join at all, and both the repair-request
  controller (`BuildScopedFilter`, `ResolveProviderCategoryIds`) and `OffersService.Create`
  build on that unfiltered result (or, for offers, on `ProvidersService.FindById` directly)
  without checking status themselves.

At the time this was written, an owner was not guaranteed to own exactly one provider —
`Provider.ownerUserId` had no unique constraint, and `ListCategoryIdsForOwner` aggregated
categories across every provider the owner had. This shaped the repair-request fix below: the
correct unit of "verified" for category-based access is the provider, not the owner — filtering
the join per-provider rather than resolving one verification flag per owner.

**Update (post-implementation)**: a follow-up fix added a unique constraint on
`Provider.ownerUserId` (migration `RequireUniqueProviderOwner1787395703291`), closing a separate
gap where `ProvidersService.Create` never checked for an existing provider before creating
another one for the same owner. An owner can now only ever own zero or one provider. The
per-provider (not per-owner) filtering in `ListCategoryIdsForOwner` is still correct and needed
no change — it just no longer has a multi-provider case to handle in practice.

Global `ValidationPipe` runs with `forbidNonWhitelisted: true`, so a DTO field that's dropped
entirely turns a caller still sending it into a 400, not a no-op.

## Goals / Non-Goals

**Goals:**
- Close both gaps described in the proposal with the smallest change that fully satisfies the
  spec scenarios.
- Preserve today's documented client contract (`FRONTEND_INTEGRATION.md` §5 already tells the
  frontend to send `verification_status=verified`) without a 400 regression for existing
  callers.

**Non-Goals:**
- No admin-facing "browse providers by status" endpoint — `verification-requests` already
  covers admin moderation of pending providers; if admin ever needs a filtered provider browse,
  that's a separate change.
- No change to `GET /providers/:id` / `GET /providers/slug/:slug` (unaffected per spec).
- No change to `direct-inquiries` — out of scope for this change; a customer messaging a
  provider directly is a different capability from the repair-request marketplace flow the
  proposal targets, and isn't mentioned in the request driving this change.

## Decisions

**1. Public provider list: enforce `verified` server-side, keep the query field inert.**
`ProviderRepository.List` drops the caller-controlled verification clause and always adds
`WHERE provider.verificationStatus = 'verified'`. `ListProvidersFilter.verificationStatus` is
removed (the repository no longer needs it as an input). `ListProvidersQueryDto` keeps the
`verification_status` field so a client still sending it (per current docs) doesn't get a 400
from `forbidNonWhitelisted`, but the controller stops forwarding it to the service — the field
becomes accepted-and-ignored. `FRONTEND_INTEGRATION.md` §5 gets a note that the filter is
inert and directory results are always verified-only.
  - *Alternative considered*: keep `verificationStatus` as a real filter input on `List` and
    have the controller hardcode `VerificationStatus.Verified` when calling it. Rejected because
    it leaves the enforcement in the presentation layer — a future controller change (or another
    caller of the same service method) could reintroduce the leak. Enforcing it inside the
    service/repository means the public directory is safe regardless of what any caller passes.

**2. Repair-request category resolution becomes verified-provider-aware, not owner-aware.**
`ProviderCategoryRepository.ListCategoryIdsForOwner` adds
`AND provider.verificationStatus = 'verified'` to its existing join. No signature change, no
new method, no controller/service change in `repair-requests` at all — `BuildScopedFilter` and
`ResolveProviderCategoryIds` already thread this result into the existing empty-array-blocks-all
mechanics (`ANY(:categoryIds)` over an empty array matches nothing; `providerCategoryIds.includes(...)`
over an empty array is always `false`, which already throws the existing
`REPAIR_REQUEST_CATEGORY_NOT_SERVICED`).
  - *Alternative considered*: resolve "is this owner verified" as one boolean per owner (e.g. a
    new `ProvidersService.FindVerificationForOwner`) and check it explicitly before the category
    check, throwing a distinct `PROVIDER_NOT_VERIFIED` error. Rejected: since an owner can have
    more than one provider, a single boolean per owner is the wrong unit and would either
    under- or over-block owners with a mix of verified and non-verified providers. Filtering the
    category join per-provider is correct in both the single- and multi-provider case and needs
    no new plumbing. The trade-off is the existing `REPAIR_REQUEST_CATEGORY_NOT_SERVICED` error
    is reused for the unverified case too instead of a more specific message — acceptable since
    the spec only requires the request be denied, not a specific error code, and the message is
    still accurate from the requester's point of view (none of their verified providers service
    this category).

**3. Offers: check the specific provider's status directly.**
`OffersService.Create` already loads the `Provider` by `input.providerId` to check ownership.
Add a check right after that load: if `provider.verificationStatus !== VerificationStatus.Verified`,
throw `DomainForbiddenException('PROVIDER_NOT_VERIFIED', ...)` before touching the repair
request or creating the offer. This is per-provider (the offer names one specific provider), so
there's no owner-aggregation ambiguity here the way there is for repair-request category
resolution.

## Risks / Trade-offs

- [Existing `pending`/`rejected` providers currently mid-flow (already have offers submitted or
  requests they can see) lose that access the moment this ships] → Acceptable and intended: the
  whole point is that unverified providers shouldn't have that access. No data migration needed
  since nothing is deleted, only newly denied going forward.
- [Reusing `REPAIR_REQUEST_CATEGORY_NOT_SERVICED` for the unverified-provider case is a less
  precise error than a dedicated code] → Accepted per Decision 2's rationale; revisit only if a
  future change needs the frontend to distinguish the two cases in the UI.
- [`ListProvidersQueryDto.verificationStatus` stays in the DTO but does nothing] → Documented in
  `FRONTEND_INTEGRATION.md`; a future cleanup can remove it once confirmed no client still sends
  it.

## Migration Plan

No data migration. Deploy as a normal backend release; behavior changes take effect immediately
on the next request to the affected endpoints. No rollback concerns beyond reverting the
release if needed.
