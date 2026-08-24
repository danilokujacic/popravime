# Popravime Backend — Progress Log

Full plan: `.claude/plans/compressed-twirling-hummingbird.md` (Phase 1 scope + build order).
Coding standards: `.claude/skills/coding-standards/SKILL.md`.

## Status

Phase 1, 2, and 3 are all feature-complete. Phase 1 build-order steps 1–17 and 19 done (step 18,
Docker Compose, is written but unverified — no Docker in this sandbox). Phase 2/3 build-order
steps 20–39 done per `.claude/plans/compressed-twirling-hummingbird.md` — see the "Phase 2 + 3"
section below for the full write-up.

Phases 4–6 are also done — these are **not new product scope**, they close out the concrete
backlog Phase 1/2/3 already disclosed above (transactional integrity, ownership/validation
hardening, audit-trail completeness, and a re-attempt at Docker Compose). See the "Phase 4 + 5 +
6" section below. A small follow-up "Closeout pass" after that resolved the last three items
Phase 4–6 itself disclosed as still-open (see that section, near the end).

After that, a **"Prod/demo readiness pass"** (see that section below) audited and closed the
gaps a real frontend integration or demo deploy would actually hit: CORS, `helmet`, response
compression, graceful shutdown, unbounded file uploads, a dead `emailVerified` field, and a
logout endpoint that didn't actually revoke anything. The only genuinely outstanding item left
in this whole log is Docker Compose / `test:integration` execution, blocked by the sandbox
environment having no Docker daemon at all — not by any remaining code work. See
`FRONTEND_INTEGRATION.md` for what a frontend needs to build against this API.

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

### Step 18 — Docker Compose (written, still unverified — re-checked in Phase 6)
`docker-compose.yml`, `Dockerfile`, `nginx/nginx.conf` exist per the plan (api/postgres/redis/
minio/maildev/nginx, dev-only postgres, edge/internal network split) but `docker compose up`
has never actually been run. Re-checked as part of Phase 6 (build-order step 64): still no
Docker daemon available in this sandbox — `docker info` fails, there's no `dockerd` binary, no
`docker.service` systemd unit, and no `/var/run/docker.sock`; only a Docker Desktop *client*
pointed at a socket that lives outside this sandbox. Confirmed genuinely blocked, not just
unattempted. One thing *was* verified without a daemon: `docker compose config` (pure
syntax/interpolation, no daemon needed) resolves cleanly and correctly picks up every `.env`
variable added across Phases 2–6, including the newest `THROTTLE_CONTACT_MESSAGE_*` pair — so
the compose file itself is structurally sound. Still needs a real pass in an environment with
Docker: `docker compose up --build`, confirm `/health` through nginx reports both `database` and
`redis` up, exercise one full vertical slice through nginx, and run `pnpm run test:integration`
for real (it also can't be executed here for the same reason).

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

## Phase 2 + 3

Full plan: `.claude/plans/compressed-twirling-hummingbird.md` (Phase 2/3 scope, decisions locked
in with the user, and build order steps 20–39).

### What's done

18. **Notifications module** — `NotificationsService.Notify(...)` persists a `notifications` row
    then enqueues the matching email; it's the *only* thing besides `EmailModule` itself allowed
    to touch `EmailQueueService`. `OffersService` and `RepairRequestsService` were refactored
    onto it (their direct `EmailQueueService` calls removed). `EmailJob` union grew 6 variants
    (`status-change`, `review-created`, `verification-approved`, `verification-rejected`,
    `new-message`, `new-inquiry`) with an exhaustive (no-`default`) switch in `email.processor.ts`.
19. **Reviews module** — `ProviderRatingCalculator` (pure, unit-tested empty/single/rounding
    cases) + `ReviewsService.Create` synchronously recomputes and persists
    `providers.average_rating`/`review_count` on every new review, notifies the provider owner.
    DB-level guarantees: `CHECK (rating BETWEEN 1 AND 5)`, partial unique index on
    `(request_id) WHERE request_id IS NOT NULL` (one review per request).
20. **Direct inquiries module** — public submission via a new `@OptionalUser()` decorator
    (captures `customerId` when a valid token is present, otherwise relies on
    name/email/phone), provider-owner inbox.
21. **Messages module** — two nullable FKs (`request_id`, `inquiry_id`) + a DB `CHECK` requiring
    exactly one, instead of the source spec's untyped polymorphic pair — a deliberate,
    user-approved deviation that keeps real referential integrity. REST only, no WebSocket.
22. **Verification requests module** — `VerificationStatusTransitions` state machine
    (unit-tested), document upload via the existing S3 storage service, one-pending-per-provider
    limit (409 on a second submission), admin approve/reject drives
    `ProvidersService.UpdateVerificationStatus` and writes an `AuditLogsService.Log(...)` entry.
23. **Blog posts / FAQ items / price estimates** — admin-authored CMS content, public read
    endpoints (FAQ + price estimates cached via the existing `CacheService`), blog posts filtered
    to `published_at <= now()` for the public list/detail routes.
24. **Contact messages** — public submit, admin queue + status transitions.
25. **Audit logs** — write-only `AuditLogsService.Log`, wired into verification-request
    approve/reject as its first (and currently only) real caller, per the approved plan.
26. **Admin analytics** — `AdminAnalyticsService` composes four small new read methods added to
    already-existing services (`ProvidersService.CountByVerificationStatus`,
    `RepairRequestsService.CountByStatus`, `ReviewsService.OverallStats`,
    `CitiesService.TopByProviderCount`) — never reaches into another module's repository
    directly. Exposed as `GET /admin/analytics`, admin-only.
27. **Admin bootstrap** — `ADMIN_EMAIL`/`ADMIN_PASSWORD` required env vars, `SeedAdmin` in
    `seed-runner.ts`, `ON CONFLICT (email) DO NOTHING` (confirmed idempotent by re-running
    `pnpm run seed:run` live — admin count stayed at the same row).
28. **10 new migrations** (`1787395703061`–`1787395703151`) — notifications, reviews,
    direct_inquiries, messages, verification_requests, blog_posts, faq_items, price_estimates,
    contact_messages, audit_logs. Ran cleanly against a real Postgres instance this session.

Full unit suite: **60/60 passing** (13 suites), `tsc --noEmit` clean, `pnpm run lint` clean (0
errors) across the whole repo including the new modules.

### Real bugs caught by live-testing or code review (not just `tsc`)

1. **`blog-posts.repository.ts`**: `where: { publishedAt: Not(IsNull()) && LessThanOrEqual(new
   Date()) }` — `&&` between two TypeORM `FindOperator` objects doesn't AND the resulting SQL, it
   just evaluates to the second operand (plain JS truthy short-circuit), so the `Not(IsNull())`
   half was silently discarded. Fixed by dropping it — `LessThanOrEqual` alone already excludes
   NULL rows in SQL. Caught during code review, confirmed live: the public blog list/detail
   endpoints correctly returned the one published post and nothing else.
2. **`faq-items.controller.ts`**: a class-level `@UseGuards(RolesGuard) @Roles(Admin)` combined
   with a `@Public()` route in the same controller — `@Public()` only bypasses the *global*
   `JwtAuthGuard`, not a controller-level `RolesGuard`, so an unauthenticated `GET /faq-items`
   would have hit `RolesGuard` trying to read `request.user.role` on an undefined user and
   crashed. Fixed by moving the guards to per-method application on only the mutating routes.
   Live-verified this session: an unauthenticated `GET /faq-items` correctly returns `200 []`
   instead of crashing.
3. **`this.repository.exist` doesn't exist on this TypeORM version** (renamed to `exists`) —
   caught by `tsc` in `reviews.repository.ts`, fixed before it ever reached a live test.

### Live verification performed this session

No Docker in this sandbox (same constraint as Phase 1), so the same scratch-infrastructure
approach was reused — the Postgres/Redis/MinIO instances stood up during Phase 1 verification
were still running and were reused directly:

- Ran all 10 new migrations against the live scratch Postgres — clean, no errors.
- Wrote and ran a standalone script directly exercising the two new SQL-level integrity
  constraints the extended `test/integration/database.integration-spec.ts` also asserts (that
  spec still needs real Docker/testcontainers to execute — this was a substitute, not a
  replacement): the reviews partial-unique-index (second review for the same request rejected),
  the reviews rating `CHECK` (rating `6` rejected), and both directions of the messages
  exactly-one-of `CHECK` (both `request_id`/`inquiry_id` set → rejected; neither set →
  rejected). All 8 assertions passed against real Postgres.
- Confirmed `pnpm run seed:run` is idempotent: re-ran it against a DB that already had an admin
  user — no duplicate row, `ON CONFLICT (email) DO NOTHING` behaved as intended.
- Booted the full app (`ts-node -r dotenv/config -r tsconfig-paths/register src/main.ts`) against
  the scratch Postgres/Redis/MinIO — every Phase 2/3 route mapped cleanly on startup, including
  `/admin/analytics`, `/verification-requests/:id/approve`, `/blog-posts/:slug`.
- Full HTTP vertical slice: admin login → `GET /admin/analytics` (correct aggregated counts,
  correct snake_case envelope) → create + publish a blog post → confirm it appears on the public
  list and by-slug routes → create an FAQ item → confirm the public list serves it and stays
  correct across a second (cached) read → create a price estimate → confirm it's publicly
  readable → submit a contact message as an anonymous caller → confirm it shows up in the
  admin queue.
- Full provider-certification vertical slice: registered a fresh provider owner → created a
  provider → submitted a verification request with a real multipart file upload (landed in the
  live MinIO bucket, `document_url` came back correctly) → approved it as admin → confirmed
  `providers.verification_status` flipped to `verified` and `is_certified` to `true` → confirmed
  an `audit_logs` row was written (`verification_request.approved`, correct `actor_id`,
  `metadata: {reviewNotes: ...}`) → confirmed a `notifications` row was created for the provider
  owner and is visible via `GET /notifications` → marked it read via `PATCH
  /notifications/:id/read` and confirmed `is_read: true` came back.
- Checked the app log across this whole session for anything unexpected: only the two 400s from
  deliberately-malformed test payloads showed up, and `Authorization` headers were correctly
  redacted (`"authorization":"[REDACTED]"`) — no leaked secrets, no silent errors.
- `test/integration/database.integration-spec.ts` itself was extended to cover the 10 new tables
  (all new FKs, both new `CHECK` constraints, the partial unique index) but — like the Phase 1
  integration specs — could not be executed in this sandbox; it's written, `tsc`-clean, and
  lint-clean, mirroring exactly what the standalone script above already proved works against
  real Postgres.

### Known Phase 2/3 simplifications (disclosed, not hidden)

- **`NotificationsService.Notify` isn't wrapped in the same transaction as the mutation that
  triggers it** (e.g. `ReviewsService.Create` persists the review, recomputes rating stats, then
  calls `Notify` as a separate step). If the notification write fails after the review/rating
  update already committed, the user won't see an in-app notification (and, per the locked-in
  decision, no email either) even though the underlying action succeeded. Same non-atomic
  trade-off already disclosed for `OffersService.Accept` in Phase 1.
- **The one-pending-verification-request-per-provider limit is enforced in the service layer**
  (`VerificationRequestsService.Submit` checks for an existing `pending` row before inserting),
  not with a DB constraint — a rare race (two concurrent submissions) could still slip both
  through. Matches the precedent set by other business-rule checks in this codebase (e.g. the
  "one review per completed request" check partially backed by a DB unique index, but the
  "request must be `Completed`" check is service-layer only).
- **Blog post publishing is a read-time filter, not a scheduled job** — `published_at` can be set
  in the future, and the row simply won't appear in public queries until `now() >=
  published_at`, with no cron/worker to do anything at the transition. This is normal, sufficient
  behavior for a `LessThanOrEqual(now())` filter and was a deliberate no-scope-creep call, not an
  oversight.
- **`audit_logs` is currently only written from one call site** (verification-request
  approve/reject), per the approved plan's explicit "wire `Log` calls into
  `VerificationRequestsService`'s approve/reject as the first real caller" — it is not yet a
  blanket admin-action audit trail. Extending it to other admin mutations (e.g. contact-message
  status changes, FAQ/price-estimate edits) would be a small, additive follow-up.
- **Contact message submission has no bespoke rate limiting beyond the global default
  throttle** — a public, unauthenticated endpoint, so it inherits whatever `THROTTLE_DEFAULT_*`
  is configured to but has no dedicated stricter limit the way `/auth/login` does.

## Phase 4 + 5 + 6

Full plan: `.claude/plans/compressed-twirling-hummingbird.md`. Unlike Phases 1–3, this is **not
new product scope** — it's the concrete backlog Phase 1/2/3 already disclosed above (see "Known
Phase 1 simplifications" / "Known Phase 2/3 simplifications"), now closed out.

### What's done

**Phase 4 — transactional integrity** (build-order steps 57–58): added `typeorm-transactional`
(`@Transactional()` + `addTransactionalDataSource`, wired into `database.module.ts`'s
`dataSourceFactory` and `main.ts`'s bootstrap). `@Transactional()` now covers every service
method that performs more than one related DB write: `OffersService.Create`/`Accept`,
`RepairRequestsService.UpdateStatus`/`AcceptOffer`, `ReviewsService.Create`,
`MessagesService.Create`, `DirectInquiriesService.Create`, and
`VerificationRequestsService`'s private `Decide` — not just the two literally named in the
disclosure, everywhere the same pattern existed. `NotificationsService.Notify`'s email enqueue
now runs inside `runOnTransactionCommit(...)`, so a rollback anywhere in the surrounding
transaction means no notification row *and* no email, not an email fired for a rolled-back
action — with a try/catch fallback to immediate enqueue (logged as a warning) for the case where
`Notify` is ever called outside a transactional context.

**Phase 5 — validation & authorization hardening** (steps 59–62): `GET /repair-requests/:id`
now scopes by viewer (`RepairRequestsService.FindByIdForViewer` — a customer only sees their
own, provider owners and admins see any); `working_hours` validates real per-weekday shape
(`WorkingHoursDto`/`WorkingHoursRangeDto`, `HH:MM` time format, unknown weekday keys rejected)
instead of a bare `@IsObject()`; provider gallery images now store their S3 `storage_key`
directly (new nullable `provider_gallery.storage_key` column) instead of re-deriving it from the
URL on delete, with a fallback to the old derivation for any pre-existing rows; contact message
submission now has its own dedicated throttle (`THROTTLE_CONTACT_MESSAGE_LIMIT`/`_TTL_MS`, env-
configurable, same pattern as `AUTH_THROTTLE`) instead of only the global default.

**Phase 6 — audit trail completeness + Docker re-check** (steps 63–64): `AuditLogsService.Log`
is now called from `ContactMessagesService.UpdateStatus`, and
`FaqItemsService`/`PriceEstimatesService`'s `Create`/`Update`/`Delete` — closing the gap flagged
in Phase 2/3 ("`audit_logs` is currently only written from one call site"). Docker Compose was
re-attempted and re-confirmed still blocked in this sandbox (see the Step 18 note above).

Full unit suite: **70/70 passing** (17 suites), `tsc --noEmit` clean, `pnpm run lint` clean (0
errors) across the whole repo.

### Real bugs caught by live-testing (not just `tsc`)

1. **`@nestjs/typeorm`'s connection-retry logic breaks `addTransactionalDataSource` on retry.**
   `TypeOrmModule.forRootAsync`'s built-in retry mechanism re-invokes `dataSourceFactory` on
   every failed connection attempt. The first naive implementation called
   `addTransactionalDataSource(new DataSource(options))` unconditionally on each invocation —
   `addTransactionalDataSource` throws `DataSource with name "default" has already added` if a
   DataSource is already registered under that name, so after the *first* retry, every
   subsequent attempt failed with that error instead of the real underlying connection error,
   permanently masking it. Caught live: the app hung retrying with the wrong error message when
   Redis (an unrelated dependency) was down. Fixed by checking `getDataSourceByName('default')`
   first and reusing the already-registered instance across retries.
2. **The plan's own assumption about Jest compatibility was wrong.** The approved plan assumed
   "`@Transactional()` is transparent to mocked repositories in unit tests, since
   typeorm-transactional only activates against a real DataSource" — false. The decorator throws
   at call time unless `initializeTransactionalContext()` has run in-process (which `main.ts`
   does, but Jest never executes `main.ts`), and then throws again unless a DataSource is
   actually registered. Fixed properly, not by loosening a test: added `src/jest-setup.ts`
   (`initializeTransactionalContext()` + `reflect-metadata`, wired via Jest's `setupFiles`) and a
   manual mock `src/__mocks__/typeorm-transactional.ts` (Jest auto-applies node_modules manual
   mocks with zero per-spec-file boilerplate) implementing exactly the library's own documented
   "Unit Test Mocking" recommendation. `test/jest-setup.ts` was added separately for the
   integration-test config, which does *not* get the mock (it needs the real library against a
   real Postgres, when Docker becomes available).

### Live verification performed this session

The scratch Postgres/Redis/MinIO environment from Phases 1–3 was gone at the start of this
phase (sandbox restart) and had to be rebuilt from scratch **twice** during this phase (a second
mid-session restart) using the same recipe each time — `initdb`/`pg_ctl` for Postgres,
`.deb`-extraction for Redis, a downloaded static binary + `mc` for MinIO. Each time, all 20
migrations were re-run cleanly and the app was rebooted and re-verified from scratch:

- **Transaction atomicity, proven, not just asserted**: created two competing offers on a repair
  request, then temporarily inserted a deliberate `throw` into `OffersService.Accept` right
  after the offer's own status was saved but before the "reject other offers" step, restarted
  the app, and attempted the accept over real HTTP. It failed with a 500 as expected — and
  critically, **neither** the offer's status **nor** the request's status (both already written
  earlier in the same method call) were persisted; both reverted to their pre-attempt values.
  Reverted the induced failure, restarted, retried the same accept — it succeeded cleanly, the
  competing offer auto-rejected, and the request flipped to `accepted`. This is the core
  guarantee Phase 4 exists to provide, confirmed against a real Postgres transaction, not
  inferred from code review.
- Full vertical slice re-run end-to-end with every `@Transactional()`-decorated method exercised
  in sequence (register → create provider, with real Nominatim geocoding → repair request →
  offer → accept → in\_progress → completed → review) — provider `average_rating`/`review_count`
  updated correctly, notifications delivered to the right users at each step.
- `GET /repair-requests/:id`: confirmed 200 for the owning customer, 200 for a provider owner
  viewing someone else's request, and 403 (`REPAIR_REQUEST_NOT_OWNED`) for a different customer.
- `working_hours`: confirmed 400 for a bad time format (`"9am"`), 400 for an unknown weekday key
  (`forbidNonWhitelisted` correctly rejecting `"funday"`), and 200 for a valid partial week.
- Provider gallery: uploaded a real file to MinIO, confirmed `provider_gallery.storage_key` was
  populated correctly in Postgres, then deleted it via the API and confirmed via `mc ls` that the
  object was **actually gone from the MinIO bucket**, not just the DB row.
- Contact message throttle: 3 requests succeeded, the 4th and 5th both correctly returned 429.
- Audit trail: logged in as admin, created/updated/deleted a FAQ item, created/updated a price
  estimate, and changed a contact message's status — confirmed all 6 expected `audit_logs` rows
  appeared with the correct `action`/`entity_type`/`entity_id`/`actor_id`, and that
  `contact_message.status_changed` carried the right `metadata`. Also re-confirmed the public
  `GET /faq-items`/`GET /price-estimates` routes still reflect the changes correctly (cache
  invalidation unaffected by the audit-log addition).

### Known Phase 4–6 simplifications (disclosed, not hidden) — all three closed in the follow-up
pass below

- ~~`NotificationsService`'s no-transactional-context fallback path is untested by a dedicated
  unit test.~~ Closed — see "Closeout pass" below.
- ~~`WorkingHoursDto` validates shape and time format, not logical ordering.~~ Closed — see
  "Closeout pass" below.
- ~~`provider_gallery.storage_key` is nullable, not backfilled for rows created before this
  migration.~~ Closed — see "Closeout pass" below.

## Closeout pass (post Phase 4–6)

Asked what "phases 7/8/9" should cover; by this point PROGRESS.md's disclosed backlog was down
to the three items above plus the still-environment-blocked Docker item — not three phases'
worth of work. Closed the three real ones out in one small pass rather than inventing new scope:

1. **`NotificationsService.Notify` unit test added** (`notifications.service.spec.ts`, new file
   — this service had no unit test before). Because the Jest environment has no active
   `@Transactional()` context (the manual mock's `Transactional()` is a no-op and
   `runOnTransactionCommit` always throws), any unit test of `Notify` inherently exercises
   exactly the fallback path this item was about — asserts the email still enqueues, a warning
   is logged, and a persistence failure prevents any enqueue at all.
2. **`WorkingHoursDto` now validates `close > open`**, not just shape/format. New
   `CloseAfterOpenConstraint` (`dto/close-after-open.validator.ts`, its own file per the
   calculators/validators convention) — a class-validator custom constraint comparing the two
   `HH:MM` strings lexicographically (safe for zero-padded 24h time). Two new test cases added.
3. **`provider_gallery.storage_key` backfilled and made `NOT NULL`.** New migration
   (`1787395703241-backfill-provider-gallery-storage-key.ts`) runs
   `regexp_replace(image_url, '^.*/', '')` for any existing null rows (the exact same derivation
   logic the runtime fallback used), then sets the column `NOT NULL`. The entity's `storageKey`
   is now `string`, not `string | null`, and `ProviderGalleryService.Delete`'s now-dead fallback
   branch was removed — `image.storageKey` is used directly. This is the more complete fix the
   original disclosure flagged as deferred ("not backfilled").

Full unit suite: **73/73 passing** (18 suites), `tsc --noEmit` clean, `pnpm run lint` clean.

Live-verified against the same scratch Postgres/Redis/MinIO (still running from Phase 4–6):
inserted a synthetic pre-migration row with `storage_key = NULL` directly via SQL, ran the new
migration, confirmed the backfill correctly derived `legacy-uuid-legacy-photo.png` from its URL
and the column became `NOT NULL`. Then over real HTTP: `working_hours` with `close` before
`open` → 400 with `"close must be later than open"`; equal `open`/`close` → 400 (same message,
confirms strict `<` not `<=`); valid ordering → 200. Uploaded a fresh gallery image (real MinIO
upload, `storage_key` populated correctly against the new `NOT NULL` column), deleted it via the
API, confirmed via `mc ls` the object was actually gone from the bucket, not just the DB row.

## Prod/demo readiness pass

Asked directly "what is necessary for this to be prod or demo ready" — an actual audit, not
another backlog-closing pass, since by this point PROGRESS.md's disclosed backlog was empty.
Checked the gaps a real frontend integration or a demo deploy would hit immediately and closed
the ones that were genuine gaps, not judgment calls:

1. **CORS** — was completely unconfigured; any browser-based frontend on a different origin
   would have had every request blocked. `app.enableCors({...})` in `main.ts`, origin list from
   a new `CORS_ORIGIN` env var (comma-separated, defaults to reflecting any origin if unset —
   fine for dev, meant to be locked down in `.env` for a real deploy).
2. **`helmet`** — was not installed at all. Added, wired in `main.ts`; live-verified
   `Strict-Transport-Security`/`X-Content-Type-Options`/`X-Frame-Options` are now present on
   every response.
3. **`compression`** — same, added and wired; live-verified `Content-Encoding: gzip` on a
   `GET /cities` response with `Accept-Encoding: gzip`.
4. **`app.enableShutdownHooks()`** — one line, lets NestJS clean up DB/Redis connections on
   `SIGTERM` instead of the process just dying mid-connection.
5. **Unbounded file uploads.** All four multipart endpoints (provider gallery image, repair
   request photos, verification document, message attachment) accepted files of any size and
   any MIME type — a real abuse vector, not a style nit. New
   `src/common/upload/upload-limits.constants.ts`: `IMAGE_UPLOAD_OPTIONS` (5 MB,
   jpeg/png/webp only) for gallery+repair-photos, `DOCUMENT_UPLOAD_OPTIONS` (10 MB, adds PDF)
   for verification documents+message attachments — both reject wrong types via `fileFilter`
   (`415 Unsupported Media Type`) and oversized files via multer's own `limits.fileSize`
   (`413 Payload Too Large`), live-verified against a real 6 MB PNG and a `text/plain` file.
6. **Dead `emailVerified` field removed**, not left as a flow-shaped hole — nothing ever set it,
   register/login both ignored it entirely. Migration
   (`1787395703251-drop-users-email-verified.ts`) drops the column; removed from the entity,
   `UserResponseDto`, and the mapper. (Explicitly decided not to build a real email-verification
   flow for now — immediate-login-on-register stays the behavior.)
7. **`POST /auth/logout` was a complete no-op** — returned 204 but never touched the refresh
   token, so a "logged out" refresh token stayed valid until it naturally expired (up to 7 days).
   Fixed with real, per-session revocation: `JwtPayload` gained a `jti` (unique per token-pair
   issuance); a new `RefreshTokenDenylistService` (Redis-backed via the existing `CacheService`,
   extended with generic `Set`/`Get`) records a revoked `jti` with a TTL matching that token's
   own remaining lifetime; `RefreshTokenStrategy.validate` now checks the denylist before
   accepting any refresh token and rejects with 401 if revoked. `Logout` now requires the
   `refresh_token` in the body (same extraction as `/auth/refresh`) so it knows exactly which
   session to revoke — only that one device/session is affected, not all of a user's sessions.
   Live-verified: refreshed successfully, logged out with that same token, retried the identical
   refresh → 401 "Refresh token has been revoked"; confirmed a *different* still-live session's
   refresh token kept working throughout, proving the revocation is per-session, not global.
8. **Docker Compose re-checked once more** — still genuinely blocked in this sandbox (no
   change since the Phase 6 check).

Full unit suite: **77/77 passing** (19 suites — new this pass: a `Logout` case added to
`auth.service.spec.ts`, and the new `refresh-token.strategy.spec.ts`), `tsc --noEmit` clean,
`pnpm run lint` clean.

### Known limitations after this pass (disclosed, not hidden)

- **No password-reset flow.** Explicitly scoped out for now (a real decision, not an oversight)
  — there is no "forgot password" endpoint. A user who loses their password has no self-service
  recovery path. Worth building before a real production launch; skipped here to keep this pass
  bounded to genuine gaps rather than open-ended new scope.
- **No email-verification gate**, per the decision above — anyone can register with any email
  address they claim, including one they don't own, and use the app immediately.
- **CORS defaults permissive if `CORS_ORIGIN` is unset** (reflects any origin) — fine for local
  dev against this repo's own `.env`, but must be set to the real frontend's origin(s) before any
  actual deployment; `.env.example` documents this but doesn't enforce it.
- **File upload limits are fixed constants**, not configurable per-environment via `.env` — a
  deliberate simplification (matches how `MAX_PHOTOS` was already a fixed constant, not env-
  driven, before this pass) rather than adding more surface to the "ask before adding a new env
  var" judgment call for something this unlikely to need runtime tuning.

## Git status
Phases 1 through 6, and the Closeout pass, are committed: `accd99d init` → `b71afc1 phase 1` →
`c4b4e75 phase 2 and 3` → `78cdd26 phases 4,5,6` → `3e4df3b progress` (the Closeout pass,
committed by the user directly, not by this session). Only the Prod/demo readiness pass above is
uncommitted as of now — `git status --short` shows 22 modified tracked files (including this
file) and 6 new untracked
paths (`src/common/upload/`, `1787395703251-drop-users-email-verified.ts`,
`src/modules/auth/decorators/`, `refresh-token-session.interface.ts`,
`refresh-token-denylist.service.ts`, `refresh-token.strategy.spec.ts`). Waiting for review before
committing.
