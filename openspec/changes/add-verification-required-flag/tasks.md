## 1. Config

- [x] 1.1 Add `VERIFICATION_REQUIRED: Joi.boolean().default(true)` to `src/config/env.validation.ts` and verify `tsc` type-checks and the app still boots with no `VERIFICATION_REQUIRED` set in `.env`
- [x] 1.2 Create `src/config/verification.config.ts` exporting `VerificationConfig { required: boolean }` via `registerAs('verification', ...)`, reading `VERIFICATION_REQUIRED` and defaulting to `true`
- [x] 1.3 Register `verificationConfig` in `ConfigNamespaces` in `src/config/configuration.ts` and verify `tsc` type-checks
- [x] 1.4 Add `VERIFICATION_REQUIRED=true` to `.env.example` (or equivalent sample env file) with a one-line comment on what it controls

## 2. Shared eligibility logic

- [x] 2.1 Add `IsEligibleVerificationStatus(status: VerificationStatus, required: boolean): boolean` to `src/modules/providers/providers.types.ts` and verify a unit test covers: `verified` always eligible; `pending` eligible only when `required` is `false`; `rejected` never eligible regardless of `required`
- [x] 2.2 Add `EligibleStatuses(required: boolean): VerificationStatus[]` alongside it (returns `[Verified]` or `[Verified, Pending]`) for the two SQL call sites, and verify a unit test covers both `required` values

## 3. Public provider directory

- [x] 3.1 Inject `@Inject(verificationConfig.KEY) config: ConfigType<typeof verificationConfig>` into `ProviderRepository` (`src/modules/providers/repositories/provider.repository.ts`)
- [x] 3.2 Replace the hard-coded `provider.verificationStatus = :verificationStatus` clause in `List` with `provider.verificationStatus = ANY(:eligibleStatuses)`, bound to `EligibleStatuses(config.required)`, and verify a unit or integration test shows: `pending` providers excluded when `required` is `true`, included when `required` is `false`, and `rejected` providers excluded in both cases
- [x] 3.3 Verify `providers.service.spec.ts` and any existing `List`-related tests still pass unchanged (public directory behavior with the default `required: true` config is identical to before this change)

## 4. Repair-request visibility for provider owners

- [x] 4.1 Inject `@Inject(verificationConfig.KEY) config: ConfigType<typeof verificationConfig>` into `ProviderCategoryRepository` (`src/modules/providers/repositories/provider-category.repository.ts`)
- [x] 4.2 Replace the hard-coded `provider.verificationStatus = :verificationStatus` clause in `ListCategoryIdsForOwner` with `provider.verificationStatus = ANY(:eligibleStatuses)`, bound to `EligibleStatuses(config.required)`, and verify a test shows: a `pending` provider owner's serviced categories are returned when `required` is `false` and empty when `required` is `true`, and a `rejected` provider owner's categories are always empty
- [x] 4.3 Verify `RepairRequestsController.BuildScopedFilter`/`ResolveProviderCategoryIds` need no code change (they already consume `FindCategoryIdsForOwner`'s result via existing empty-array-blocks-all mechanics) by re-reading `src/modules/repair-requests/repair-requests.controller.ts` after step 4.2 and confirming no direct verification-status reference exists there

## 5. Offer submission

- [x] 5.1 Inject `@Inject(verificationConfig.KEY) config: ConfigType<typeof verificationConfig>` into `OffersService` (`src/modules/offers/offers.service.ts`)
- [x] 5.2 Rename `EnsureProviderVerified` to `EnsureProviderEligible`, change its condition to `!IsEligibleVerificationStatus(verificationStatus, config.required)`, keep the thrown `DomainForbiddenException('PROVIDER_NOT_VERIFIED', ...)` unchanged, and update the one call site in `Create`
- [x] 5.3 Update `offers.service.spec.ts`: existing "pending provider rejected" case now asserts rejection only when `config.required` is `true`; add a case asserting a `pending` provider's offer is created when `config.required` is `false`; add/keep a case asserting a `rejected` provider's offer is always rejected regardless of `config.required`

## 6. Logging

- [x] 6.1 Add `config.required` (or an equivalently named field) to the existing info-level log line in `ProviderRepository.List`'s caller path, `ProviderCategoryRepository.ListCategoryIdsForOwner`'s caller path, and `OffersService.Create`/`EnsureProviderEligible`'s rejection log, and verify each logs the resolved flag value by inspecting local dev logs for one request on each path — logging moved to the `ProvidersService` layer (`List`, `FindCategoryIdsForOwner`) rather than into `ProviderRepository`/`ProviderCategoryRepository`, since no repository in this codebase injects a logger (persistence layer stays thin); `design.md` Decision 4 updated to match

## 7. Integration coverage

- [x] 7.1 Extend the existing `@testcontainers/postgresql` integration tests in `test/integration/database.integration-spec.ts` (they already exercised `ProviderRepository.List` and `ProviderCategoryRepository.ListCategoryIdsForOwner` against a live Postgres) to construct both a `required: true` and a `required: false` repository instance and assert: `required: true` hides `pending`/`rejected`; `required: false` includes `pending` but still hides `rejected` — `pnpm exec tsc --noEmit` passes; could not execute `pnpm test:integration` in this environment (no Docker daemon available), so ask the user or CI to confirm the run

## 8. Verification

- [x] 8.1 Run `pnpm test` (unit) and `tsc` (type-check) and verify both pass with no regressions — 30 suites / 151 tests pass, `tsc --noEmit` clean
- [ ] 8.2 Manually verify end-to-end with the dev server: set `VERIFICATION_REQUIRED=false`, restart, confirm a `pending` provider appears in `GET /providers`, its owner can list repair requests in its categories, and it can submit an offer; then set `VERIFICATION_REQUIRED=true`, restart, and confirm all three revert to being blocked — NOT DONE: this sandbox has no Docker daemon and no local Postgres/Redis reachable, so the dev server (and `pnpm test:integration`, task 7.1) could not actually be run here; needs to be done by the user or CI
