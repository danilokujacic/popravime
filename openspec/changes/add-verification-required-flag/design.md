## Context

See `proposal.md` - Why. Three call sites currently hard-code `verificationStatus = 'verified'`,
all implemented by change `restrict-unverified-providers` (never archived/synced to
`openspec/specs/`):

- `ProviderRepository.List` (`src/modules/providers/repositories/provider.repository.ts`) adds
  `AND provider.verificationStatus = 'verified'` unconditionally to the public directory query.
- `ProviderCategoryRepository.ListCategoryIdsForOwner`
  (`src/modules/providers/repositories/provider-category.repository.ts`) joins
  `AND provider.verificationStatus = 'verified'` when resolving a provider owner's serviced
  category ids, which both `RepairRequestsController.BuildScopedFilter`/`ResolveProviderCategoryIds`
  and any other consumer rely on for repair-request visibility.
- `OffersService.EnsureProviderVerified` (`src/modules/offers/offers.service.ts`) throws
  `DomainForbiddenException('PROVIDER_NOT_VERIFIED', ...)` whenever `verificationStatus !==
  VerificationStatus.Verified`.

`ConfigModule` is registered with `isGlobal: true` in `app.module.ts`, and the established
pattern for a config namespace consumed inside a service/repository (not just at
`*Module.forRootAsync`) is direct injection of the namespace token — see
`NominatimClient` (`src/modules/providers/geocoding/nominatim.client.ts`):
`@Inject(geocodingConfig.KEY) private readonly config: ConfigType<typeof geocodingConfig>`.
Every existing config namespace lives in its own `src/config/<name>.config.ts` file
(`throttle.config.ts`, `geocoding.config.ts`, etc.), registered in `configuration.ts` and
validated in `env.validation.ts` with `Joi.boolean().default(...)` for boolean flags (e.g.
`DATABASE_SSL`, `STORAGE_FORCE_PATH_STYLE`).

## Goals / Non-Goals

**Goals:**
- One flag, one source of truth, consumed identically at all three call sites — no risk of the
  three checks drifting out of sync.
- Preserve `rejected` as always-excluded, at both call sites and independent of the flag, per the
  proposal's answered question.
- Zero behavior change when the flag is left at its default (`true`).

**Non-Goals:**
- No runtime/admin-toggleable setting — this is an env-var flag, changed by editing `.env` and
  restarting/redeploying, per the proposal's answered question. A DB-backed instant toggle is a
  separate future change if ever needed.
- No new endpoint, DTO field, or query param — `ListProvidersQueryDto.verificationStatus` stays
  exactly as inert as it is today (see `restrict-unverified-providers`'s design.md Decision 1);
  this change does not touch it.
- No change to `verification-requests` (admin moderation) or `admin-analytics` — both already
  operate on the full `verificationStatus` value and are unaffected by this flag.
- No change to how a `rejected` provider is produced or reviewed — only to which checks treat
  `pending` as eligible.

## Decisions

**1. New dedicated config namespace: `src/config/verification.config.ts`.**
`export interface VerificationConfig { required: boolean }`, `registerAs('verification', ...)`,
env var `VERIFICATION_REQUIRED` (`Joi.boolean().default(true)` in `env.validation.ts`, matching
the `DATABASE_SSL`/`STORAGE_FORCE_PATH_STYLE` pattern), registered in `ConfigNamespaces` in
`configuration.ts`.
  - *Alternative considered*: add `verificationRequired` to the existing `appConfig` namespace.
    Rejected — every other config concern in this repo already gets its own namespace file once
    it's more than an incidental app-wide setting (throttle, geocoding, storage, email all do
    this), and a dedicated namespace makes the flag trivially greppable/extendable if a second
    verification-related setting is ever needed.

**2. A single shared helper decides eligibility; each call site injects the config and applies it
locally.**
Add one pure function, `IsEligibleVerificationStatus(status: VerificationStatus, required:
boolean): boolean`, in `src/modules/providers/providers.types.ts` (alongside the
`VerificationStatus` enum it operates on):
```
status === VerificationStatus.Verified ||
(!required && status === VerificationStatus.Pending)
```
Each of the three call sites injects `@Inject(verificationConfig.KEY) config:
ConfigType<typeof verificationConfig>` and uses `config.required` — either passed into the
existing SQL clause as an additional bind parameter (repository sites) or passed to
`IsEligibleVerificationStatus` (service site).
  - *Alternative considered*: resolve eligibility once in `ProvidersService` and expose e.g.
    `ProvidersService.GetEligibleStatuses(): VerificationStatus[]`, then have the two
    repositories and `OffersService` call it before querying. Rejected — `ProviderRepository` and
    `ProviderCategoryRepository` build their own query filters directly against
    `verificationStatus` today with no existing indirection through `ProvidersService`; introducing
    one now, just for this flag, is a larger structural change than the proposal calls for.
    Injecting the config namespace directly at each site is the same pattern `NominatimClient`
    already establishes, and keeps each site's existing shape.
  - *Alternative considered*: keep `= 'verified'` as a Postgres string, and switch to `IN
    (:...eligibleStatuses)` with the array built in TypeScript from
    `IsEligibleVerificationStatus`. This is the concrete plan for the two repository sites (bind
    `eligibleStatuses: EligibleStatuses(config.required)` and use `provider.verificationStatus =
    ANY(:eligibleStatuses)`), since it reuses the same shared logic as the service site rather
    than hand-writing an equivalent `OR` clause in SQL.

**3. `EnsureProviderVerified` renamed as its condition changes.**
`OffersService.EnsureProviderVerified` becomes `EnsureProviderEligible` (still private), taking
the provider's `verificationStatus` and calling the shared `IsEligibleVerificationStatus` helper
with the injected `config.required`; the thrown exception stays `DomainForbiddenException`
with code `PROVIDER_NOT_VERIFIED` — the error code doesn't need to change, since from the
caller's perspective a `pending` provider that fails this check still isn't verified, and no
spec scenario requires a distinct code for this case.

**4. Logging happens at the service layer, not inside the two repositories.**
No repository in this codebase (18 of them, none) injects a `PinoLogger` — logging is
consistently a service-layer concern here. So instead of logging inside `ProviderRepository`
and `ProviderCategoryRepository` (which only build the query), `ProvidersService.List` and
`ProvidersService.FindCategoryIdsForOwner` — today thin pass-throughs with no logging at all —
each gain an info-level log line including the resolved `verification.required` value, alongside
the query/result shape they already have easy access to (filter, page, total; ownerUserId,
category count). `OffersService` already has a logger, so its existing "Offer submitted" success
log gains the same field, and its rejection path (previously just a thrown exception, not logged)
gains a warn-level log before throwing. This keeps the flag's state observable per §6 without
introducing a new architectural pattern (a repository-level logger) for a single field.

## Risks / Trade-offs

- [Toggling the flag requires a restart/redeploy, not an instant switch] → Accepted per the
  proposal's answered question; the business timeline for turning on billing/verification is not
  sub-minute, and adding a DB-backed instant toggle would be new infrastructure this change does
  not need.
- [`pending` providers gain real customer-facing exposure (directory listing, repair-request
  offers) while unverified] → Intended and is the entire point of the flag; operationally, the
  business controls exposure by leaving `VERIFICATION_REQUIRED=true` until ready.
- [A `pending` provider that submits offers or appears in the directory while the flag is off,
  then is later `rejected` after the flag is turned back on or was already `true`, loses that
  access going forward] → Same as `restrict-unverified-providers`'s existing accepted risk — no
  data is deleted, access is just no longer granted going forward.

## Migration Plan

No data migration. `VERIFICATION_REQUIRED` is optional in `.env` (defaults to `true`, so an
existing deployment's behavior is unchanged until the operator explicitly sets it to `false`).
Deploy as a normal backend release; toggling the flag afterward takes effect on the next
restart/redeploy of the API. No rollback concerns beyond reverting the release, or setting
`VERIFICATION_REQUIRED=true` and restarting, if needed.
