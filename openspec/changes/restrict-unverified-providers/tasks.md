## 1. Public provider directory

- [x] 1.1 In `ProviderRepository.List`, replace the caller-driven verification-status clause
      with a fixed `provider.verificationStatus = 'verified'` condition; remove
      `verificationStatus` from `ListProvidersFilter`. Verify with a repository/service unit
      test asserting `List` never returns a `pending` or `rejected` provider even when no
      filter (or a `pending`/`rejected` filter) is passed in.
- [x] 1.2 In `ProvidersController.List`, stop forwarding `query.verificationStatus` into the
      filter passed to `providersService.List` (keep the field on `ListProvidersQueryDto` so
      requests that still send it don't 400 under `forbidNonWhitelisted`). Verify by
      confirming the DTO field remains declared but no controller code path reads it.
- [x] 1.3 Add coverage that `ProviderRepository.List` only ever returns `verified` providers.
      No repository-level unit-test pattern exists elsewhere in this codebase (repositories are
      only exercised via real-DB integration tests), so this is added as a new case in
      `test/integration/database.integration-spec.ts` seeding `pending`/`verified`/`rejected`
      providers and asserting only the verified one comes back. Verify with
      `pnpm test:integration`.
- [x] 1.4 Update `FRONTEND_INTEGRATION.md` §5 to note `verification_status` on `GET /providers`
      is accepted but has no effect — the directory always returns `verified` providers only.
      Also updated §7.1/§7.2 for the repair-request and offer verification gating from
      section 2/3 below. Verified by re-reading the updated sections for accuracy.

## 2. Repair-request visibility for providers

- [x] 2.1 In `ProviderCategoryRepository.ListCategoryIdsForOwner`, add
      `AND provider.verificationStatus = 'verified'` to the existing join so an owner's
      non-verified providers no longer contribute category ids. Verified with a new case in
      `test/integration/database.integration-spec.ts` (same repository-testing convention as
      1.3): an owner with only a `pending` provider resolves to `[]`; an owner with one
      `pending` and one `verified` provider resolves to only the verified provider's category
      ids. Verify with `pnpm test:integration`.
- [x] 2.2 `RepairRequestsService.FindByIdForViewer` already had unit coverage for a
      non-matching-but-nonempty `providerCategoryIds` array denying access; added a new case
      for the empty-array shape that a `pending`/`rejected`-only provider owner now resolves to.
      `List`/`BuildScopedFilter` have no existing controller-level unit tests in this codebase
      (only exercised via the HTTP integration suite) — the `List`-empties-out behavior is
      covered end-to-end in 2.3 instead, consistent with that precedent. Verify with
      `pnpm test`.
- [x] 2.3 Updated `test/integration/repair-request-flow.integration-spec.ts`: all baseline
      fixture providers (mobile, plumbing, second-mobile) are now marked `verified` right after
      creation via a new `VerifyProviders` helper (direct SQL update, mirroring how the admin
      user fixture is seeded), so the existing flow/race tests keep exercising what they're
      actually about. Added a dedicated `pendingProviderToken`/`pendingProviderId` fixture left
      at the default `pending` status, and a new test asserting it gets an empty list and a 403
      on direct lookup for an approved request in its serviced category. Verify with
      `pnpm test:integration`.

## 3. Offers require a verified provider

- [x] 3.1 In `OffersService.Create`, after loading the provider and confirming ownership, throw
      `DomainForbiddenException('PROVIDER_NOT_VERIFIED', ...)` when
      `provider.verificationStatus !== VerificationStatus.Verified`, before checking the
      request's offer-accepting status or creating the offer. Verified with unit tests in
      `offers.service.spec.ts` asserting `Create` rejects for a `pending` and a `rejected`
      provider (`offersRepository.Create` never called), and still succeeds for a `verified`
      one (the pre-existing success test now builds a `verified` provider explicitly). Verify
      with `pnpm test`.
- [x] 3.2 Extended the same new test from 2.3 to also call `POST /offers` as the `pending`
      provider owner and assert `403` with `error.code === 'PROVIDER_NOT_VERIFIED'`. Verify
      with `pnpm test:integration`.

## 4. Full verification

- [ ] 4.1 Run `pnpm test` (unit) and `pnpm test:integration` (or the project's integration test
      script) and confirm all suites pass.
- [ ] 4.2 Run `tsc` (type-check) and confirm it passes with no errors.
