## Why

Providers start in `pending` verification status and only move to `verified` after an admin
approves a submitted verification request. Today that status is purely informational: the
public provider directory (`GET /providers`) returns providers of every status unless the
caller happens to pass `verification_status=verified` itself, and the repair-request pipeline
lets any provider owner — `pending` or even `rejected` — list, view, and submit offers on
customer repair requests as soon as their categories are set up. This exposes unverified,
unvetted businesses to customers browsing the directory and lets them respond to repair
requests before Popravime has confirmed they're a legitimate business, defeating the purpose
of the verification workflow.

## What Changes

- `GET /providers` (public directory) always excludes providers whose `verification_status`
  is not `verified`, regardless of what `verification_status` query value (or none) the caller
  sends. **BREAKING**: the `verification_status` query param can no longer be used to retrieve
  `pending`/`rejected` providers through this endpoint.
- `GET /providers/:id` and `GET /providers/slug/:slug` are unchanged — an unverified provider's
  own profile page stays reachable by direct ID/slug link (e.g. so the owner can preview it),
  it just won't surface through the directory listing.
- Repair-request visibility for provider owners (`GET /repair-requests` list and
  `GET /repair-requests/:id`) is scoped to owners of a `verified` provider. A provider owner
  whose provider is `pending` or `rejected` now sees an empty list and gets a 403 on a direct
  request lookup, the same way they're already blocked from requests outside their serviced
  categories.
- Submitting an offer (`POST /offers`) on a repair request is rejected for a provider that is
  not `verified`, closing the gap where an unverified provider could still respond to a request
  they aren't supposed to see (confirmed reachable today via the integration test that walks a
  freshly-created, still-`pending` provider through a full accepted-offer flow).

## Capabilities

### New Capabilities
- `providers`: visibility rules for the public provider directory based on verification status.
- `repair-requests`: access rules restricting which providers can see and act on repair requests
  based on their provider's verification status.

### Modified Capabilities
(none — no existing specs predate this change)

## Impact

- `src/modules/providers/providers.controller.ts`, `providers.service.ts`,
  `providers.service.interface.ts`, `repositories/provider.repository.ts`: public `List` no
  longer accepts a client-supplied verification filter; always scoped to `verified`.
- `src/modules/providers/dto/list-providers-query.dto.ts`: drop the public `verification_status`
  query field (or keep parsing but ignore it — see design.md).
- `src/modules/repair-requests/repair-requests.controller.ts`,
  `repair-requests.service.ts`: provider-owner scoping (`BuildScopedFilter`,
  `EnsureViewable`) needs the requesting provider's verification status, not just its category
  ids.
- `src/modules/providers/repositories/provider-category.repository.ts` (or a new
  `ProvidersService` lookup): needs a way to resolve a provider owner's verification status
  alongside (or instead of) their category ids.
- `src/modules/offers/offers.service.ts`: `Create` needs a verification check before accepting
  an offer.
- Existing tests likely to need updates: `providers.service.spec.ts`,
  `repair-requests.service.spec.ts`, `offers.service.spec.ts`,
  `test/integration/repair-request-flow.integration-spec.ts` (the walk-through currently relies
  on an unverified provider being able to complete the full flow).
- `FRONTEND_INTEGRATION.md` §5 documents `verification_status` as a client-supplied directory
  filter — needs a note that the directory is always verified-only now.
