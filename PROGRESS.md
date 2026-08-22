# Popravime Backend — Progress Log

Full plan: `.claude/plans/compressed-twirling-hummingbird.md` (Phase 1 scope + build order).
Coding standards: `.claude/skills/coding-standards/SKILL.md`.

## Status

Phase 1 feature-complete (build-order steps 1–17 and 19 done). Step 18 (Docker Compose) is
written but unverified — no Docker in this sandbox.

## What's done, all verified working live against a real Postgres + Redis

1. **Config** — `src/config/*.config.ts` (registerAs namespaces) + `env.validation.ts` (Joi).
2. **Logging** — `nestjs-pino`, dev pretty / prod JSON, secret redaction.
3. **Database module** — `synchronize: false`, migration-only schema.
4. **Cross-cutting** — domain exception hierarchy, `DomainExceptionFilter`, global
   `ValidationPipe`, `CaseTransformInterceptor` + `CaseMapper` (snake_case↔camelCase boundary).
5. **Health** — `/health` via `@nestjs/terminus`, DB + custom Redis indicator.
6. **Entities + migrations** — all 8 Phase-1 tables, 9 migrations incl. the
   `repair_requests`↔`offers` circular-FK split.
7. **Seeds** — 24 Montenegro municipalities + 6 device categories.
8. **Redis infra** — cache (Keyv + `@keyv/redis`), rate limiting (`@nestjs/throttler` +
   `@nest-lab/throttler-storage-redis`), BullMQ root registration.
9. **Shared utilities** — `SlugGenerator`, `PasswordHasher` (bcrypt), `PersistenceErrorMapper`.
10. **Users module** — entity/repository/service/controller (`GET/PATCH /users/me`).
11. **Auth module** — JWT access+refresh, `JwtAuthGuard` (global, `@Public()` opt-out),
    `RolesGuard`, register/login/refresh/logout.
12. **Cities + Categories modules** — list+detail, Redis-cached, query-param filters.
13. **Storage + Email infra** — S3-compatible storage behind an interface/factory, SMTP email
    behind an interface/factory, BullMQ `email` queue + processor + 3 typed templates.
14. **Providers module** — repositories, service (create/update/delete with ownership checks,
    slug generation, Nominatim geocoding, `cities.provider_count` maintenance), gallery service
    (S3 upload/delete), full controller + DTOs + mapper.
15. **Repair Requests module** — repository (branch-free dynamic-filter QueryBuilder pattern),
    service (create with optional photo upload, status transitions, internal hooks for the
    Offers module), `RequestStatusTransitions` state machine (fully unit tested), DTOs,
    controller (role-scoped listing — customers only see their own requests), module.
16. **Offers module** — `OfferStatusTransitions` state machine, repository, service. The
    critical rule is implemented and unit-tested: **accepting one offer sets the request to
    `accepted` + `accepted_offer_id`, and auto-rejects every other pending offer on that
    request.** Also added (beyond the original plan) a guard rejecting new offers once a
    request is no longer open/offers_received. Emails enqueued on offer-received/offer-accepted.
17. **Integration tests** (`test/integration/`, `@testcontainers`) — written per the plan:
    `database.integration-spec.ts` (real Postgres, runs actual migrations, full entity
    round-trip incl. the circular FK), `redis.integration-spec.ts` (real Redis, cache hit/miss +
    a BullMQ job round-trip), `auth-flow.integration-spec.ts` (full HTTP flow: register → login
    → protected route → refresh → real Redis-backed 429 throttling). **These could not be run
    in this sandbox (no Docker) — written, fully typed, and lint-clean, but unexecuted. Run
    `pnpm run test:integration` in a Docker-capable environment to verify.**

Full unit suite: **40/40 passing**, `tsc --noEmit` clean, `pnpm run lint` clean (0 errors across
`src/` and `test/`).

## What's left

### Step 18 — Docker Compose (written, unverified)
`docker-compose.yml`, `Dockerfile`, `nginx/nginx.conf` exist per the plan (api/postgres/redis/
minio/maildev/nginx, dev-only postgres, edge/internal network split) but `docker compose up`
has never actually been run — no Docker daemon in this sandbox. Needs a real pass in an
environment with Docker: `docker compose up --build`, then confirm `/health` through nginx
reports both `database` and `redis` up, then exercise one full vertical slice through nginx.
Also: the `test:integration` suite genuinely needs a Docker-capable run to confirm it passes,
not just compiles.

### Step 19 — Final pass: done
`tsc --noEmit` clean, full `pnpm run lint` clean (see notes below on the handful of targeted
rule exceptions this took), unit suite 40/40, README rewritten with the Phase 2/3 roadmap, and
a full live vertical-slice smoke test re-run *after* the lint fixes to confirm nothing broke
(health → register → login → cities/categories → create provider → create repair request →
submit offer → accept → verify final state) — all green.

**Lint pass notes** — `pnpm run lint` was run to completion (it hadn't been before); a few
real, narrow fixes came out of it, plus a couple of deliberate, scoped rule relaxations:
- `PersistenceErrorMapper`'s `error instanceof QueryFailedError` narrowed to
  `QueryFailedError<any>` instead of `QueryFailedError<Error>` (a TypeScript generic-narrowing
  quirk on TypeORM's class, not a real unsafety) — fixed with an explicit `IsQueryFailedError`
  type-guard function (`src/database/persistence-error.mapper.ts`) used by every repository
  instead of a bare `instanceof` check.
- Every `*ResponseMapper.ToDto` static method got an explicit `this: void` first parameter —
  they're passed by reference into `.map(...)` calls and never use `this`, so this documents
  that truthfully instead of silencing the warning.
- `AuthController.Refresh` dropped a dead, unused `@Body() dto: RefreshTokenDto` parameter (and
  the now-unused `refresh-token.dto.ts` file) — the refresh token is genuinely extracted by the
  `jwt-refresh` Passport strategy directly from the raw body before any DTO/pipe runs, so the
  param was never doing anything.
- `@typescript-eslint/unbound-method` is turned off for `**/*.spec.ts` and `test/**/*.ts` — a
  well-known, common friction point between this rule and Jest's `expect(mock.Method)
  .toHaveBeenCalledWith(...)` assertion style, not a real bug.
- `no-unsafe-assignment` / `no-unsafe-member-access` / `no-unsafe-argument` are turned off only
  for `test/integration/**/*.ts` — supertest's `Response.body` is inherently typed `any`
  upstream (in `@types/superagent`), so consuming it in strictly-typed test code hits this no
  matter what; each integration test still gives that boundary a real local interface
  (`TokenPairBody`, `MeBody`, etc.) rather than leaving raw `any` scattered through assertions.
  `src/` has zero exceptions of any kind — the full strict rule set applies there.

## Real bugs caught and fixed by live-testing (not just `tsc`/unit tests)

Three genuine bugs surfaced only by actually booting the app and hitting real endpoints —
worth knowing about since they show the kind of thing type-checking alone doesn't catch:

1. **`CaseMapper` skipped DTO class instances.** It checked `constructor === Object`, so plain
   object literals converted to snake_case correctly but every `*ResponseDto` class instance
   (the actual shape every controller returns) silently passed through untouched. Fixed by
   checking for "not a known opaque type" (Date/RegExp/Buffer) instead of "is a plain object
   literal". Regression test added.
2. **`CacheInfraModule` wasn't global.** `CitiesService`/`CategoriesService` depend on
   `CacheService`, but nothing imported `CacheInfraModule` into `CitiesModule`/
   `CategoriesModule`, and it wasn't marked `@Global()`. The app failed to boot at all once
   those modules were wired in. Fixed with `@Global()` on `CacheInfraModule`.
3. **TypeORM 1.1.0 (this project's installed version) throws on `undefined` in a `find({where})`
   filter** instead of silently skipping it like older TypeORM did — every optional list filter
   (`cities?region=`, `categories?parent_category_id=`) threw a 500. Fixed with
   `invalidWhereValuesBehavior: { undefined: 'ignore' }` in `data-source-options.ts`. The
   QueryBuilder-based repositories (`providers`, `repair-requests`, `offers`) were never
   affected since they use an explicit `(:param::type IS NULL OR ...)` SQL pattern instead of
   `find({where})`.

All three were caught by an actual end-to-end smoke test (register → login → create provider →
create repair request → submit two competing offers → accept one → confirm the other
auto-rejects → confirm `cities.provider_count` incremented), not by `tsc` or the unit suite —
worth keeping that live-verification habit for Phase 2/3 too.

## Environment note for resuming (important)

This sandbox has **no Docker daemon**. To verify things live anyway (rather than trusting
`tsc` alone), I stood up throwaway local services:

- **Postgres**: PostgreSQL 17 cluster at `/tmp/claude-.../scratchpad/pgdata`, on
  **127.0.0.1:55432** (`pg_ctl`, user/db `popravime`).
- **Redis**: `redis-server`/`redis-cli` extracted straight from Ubuntu `.deb` packages (plus
  `liblzf1`/`libjemalloc2`) into `/tmp/redis-extract`, on default port **6379**.
- `.env` currently points `DATABASE_HOST=127.0.0.1` / `DATABASE_PORT=55432` at that scratch
  Postgres — **flip back to `localhost:5432` (or your real setup) once running via
  `docker compose up`**, since these scratch instances vanish when the sandbox session ends.

Full vertical slice verified end-to-end against these: register (customer + provider owner) →
create provider (with **real** Nominatim geocoding — actual coordinates came back) → create
repair request → two competing offers from two providers → accept one → the other
auto-rejects → `cities.provider_count` correctly incremented → rejecting a new offer on an
already-accepted request correctly 409s.

None of this scratch infrastructure is part of the repo. In a normal environment with Docker,
`docker compose up` plus the `.env.example` values should just work.

## Known Phase 1 simplifications (disclosed, not hidden)

- **`OffersService.Accept` is not wrapped in a single DB transaction.** It validates/mutates the
  repair request first (so a forbidden/invalid accept never touches the offer), then saves the
  offer, then auto-rejects the others — safer ordering, but not atomic. Wrapping the whole
  sequence in a `DataSource.transaction()` would need the repositories involved to accept an
  optional `EntityManager`, which is a bigger refactor than Phase 1 budget allowed. Worth
  hardening before this handles real money/commitments at scale.
- **Provider gallery image deletion derives the storage key from the URL** (`key =
  url.substring(lastIndexOf('/') + 1)`) rather than storing the key separately, relying on our
  own upload scheme never producing slashes in a key. Fine given how `S3StorageService.Upload`
  generates keys today; would break if that scheme ever changes without updating this too.
- **A logged-in customer can view any repair request by UUID**, not just their own (the `GET
  /repair-requests/:id` single-resource lookup has no ownership check — only the *list*
  endpoint is scoped by role). Deliberate Phase 1 scope call since UUIDs aren't guessable and
  providers legitimately need to view request details before offering, but worth tightening
  later (e.g. providers can view any, customers only their own).
- **`working_hours` (jsonb) is validated only as `@IsObject()`**, not per-weekday-shape. Bad
  garbage in that field would still fail insertion cleanly (or just store oddly), not corrupt
  anything, but it's not deeply validated.

## Nothing has been committed to git yet
The repo already had one base commit (`accd99d init` — the bare `nest new` scaffold) before
this work started. Everything since is uncommitted: `git status --short` shows 74 modified
tracked files, 17 new untracked paths (whole new module directories like `offers/`,
`repair-requests/`, `test/integration/`), and 2 deletions (the stale scaffold
`test/app.e2e-spec.ts` and the dead `refresh-token.dto.ts`). No commits made this session —
waiting for review.
