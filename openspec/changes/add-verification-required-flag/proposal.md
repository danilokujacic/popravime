## Why

Today, verification gating is unconditional: `ProviderRepository.List`, `ProviderCategoryRepository.ListCategoryIdsForOwner`, and `OffersService.Create` all hard-code `verificationStatus = 'verified'`, so a `pending` provider is invisible in the public directory and cannot browse or submit offers on repair requests. The business plan is to let newly signed-up providers use Popravime for free during an onboarding period, before verification/billing is turned on — which today is impossible without a code change. This introduces a togglable flag so verification enforcement can be switched off for a period, then back on, without touching code.

## What Changes

- Add a boolean config flag, `VERIFICATION_REQUIRED` (env-driven via `@nestjs/config`, default `true`), read through a new `verification` config namespace.
- When the flag is `true` (default, matches today's behavior exactly): only `verified` providers appear in the public directory, only `verified`-provider owners can browse/see repair requests in their serviced categories, and only `verified` providers can submit offers.
- When the flag is `false`: `pending` providers are treated as allowed everywhere the three checks above currently require `verified` — they appear in the public directory, their owners can browse repair requests in their categories, and they can submit offers.
- In both flag states, `rejected` providers remain excluded from all three: the public directory, repair-request visibility, and offer submission. Rejection is a moderation decision (fraud, policy violation, etc.), not a billing/verification gate, and the flag does not affect it.
- No API surface changes: no new endpoint, DTO field, or query param. The flag only changes which providers satisfy the existing checks.

## Capabilities

### New Capabilities
- `providers`: no capability spec exists yet under `openspec/specs/providers/` — the current "verified only" directory-listing behavior was implemented by change `restrict-unverified-providers`, which was never archived/synced to main specs. This change writes the first `providers` capability spec, capturing both the existing default behavior and the new flag-controlled allowance for `pending` providers (rejected always excluded).
- `repair-requests`: same situation — `restrict-unverified-providers` implemented repair-request visibility and offer-submission gating, but its spec was never synced to `openspec/specs/`. This change writes the first `repair-requests` capability spec, covering both the existing default behavior and the new flag-controlled allowance for `pending` providers (rejected still excluded).

### Modified Capabilities
(none — see note above; both capabilities are net-new to `openspec/specs/`)

## Impact

- **Config**: new `src/config/verification.config.ts` namespace (`VERIFICATION_REQUIRED` env var), registered in `src/config/configuration.ts` and validated in `src/config/env.validation.ts`.
- **`src/modules/providers/repositories/provider.repository.ts`**: `List` query's verification-status clause becomes flag-aware (`verified`, or `verified OR pending` when the flag is off).
- **`src/modules/providers/repositories/provider-category.repository.ts`**: `ListCategoryIdsForOwner`'s verification join becomes flag-aware the same way.
- **`src/modules/offers/offers.service.ts`**: `EnsureProviderVerified` becomes flag-aware — allows `pending` when the flag is off, still rejects `rejected` unconditionally.
- **`src/modules/providers/providers.module.ts`** / **`src/modules/offers/offers.module.ts`**: may need `ConfigModule`/`ConfigService` wiring wherever the flag is consumed, depending on the design's chosen injection point.
- No database schema change, no data migration.
- No change to `verification-requests` (admin moderation) or `admin-analytics` — those already operate on the full `verificationStatus` value regardless of this flag.
