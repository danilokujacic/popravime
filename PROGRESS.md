# Popravime Backend — Progress Log

Full plan: `.claude/plans/compressed-twirling-hummingbird.md` (Phase 1 scope + build order).
Coding standards: `.claude/skills/coding-standards/SKILL.md`.

## Status: ~70% of Phase 1 done. Paused mid-build-order-step-15 (Repair Requests module).

## What's done (build-order steps 1–14, all verified working)

1. **Config** — `src/config/*.config.ts` (registerAs namespaces) + `env.validation.ts` (Joi). `.env` / `.env.example` written.
2. **Logging** — `nestjs-pino` wired (`src/shared/logger/pino.options.ts`), dev pretty / prod JSON, secret redaction.
3. **Database module** — `src/database/database.module.ts`, `data-source.ts` (CLI), `synchronize: false`.
4. **Cross-cutting** — domain exception hierarchy (`src/common/exceptions/`), `DomainExceptionFilter` (`src/common/filters/`), global `ValidationPipe`, `CaseTransformInterceptor` + `CaseMapper` (snake_case↔camelCase boundary).
5. **Health** — `/health` via `@nestjs/terminus`, DB + custom Redis indicator.
6. **Entities + migrations** — all 8 Phase-1 tables (`users, cities, categories, providers, provider_categories, provider_gallery, repair_requests, offers`), 9 migrations including the `repair_requests`↔`offers` circular-FK split. **Verified**: ran clean against a real Postgres (up, down, re-up).
7. **Seeds** — 24 Montenegro municipalities + 6 device categories. **Verified**: seeded correctly with diacritic-aware slugs.
8. **Redis infra** — `CacheInfraModule` (Keyv+`@keyv/redis`), `RateLimitModule` (`@nestjs/throttler` + `@nest-lab/throttler-storage-redis` — note: the packages named in the original plan, `cache-manager-redis-yet` and `nestjs-throttler-storage-redis`, turned out to be deprecated on npm; swapped for these maintained equivalents), `QueueModule` (BullMQ root). **Verified**: health check, rate-limit 429s, cache all confirmed live.
9. **Shared utilities** — `SlugGenerator` (+ diacritics + uniqueness), `PasswordHasher` (bcrypt, not argon2 per your correction), `PersistenceErrorMapper`. Unit tested.
10. **Users module** — entity, repository, service, controller (`GET/PATCH /users/me`). Every entity has its own repository per your correction.
11. **Auth module** — JWT access+refresh strategies, `JwtAuthGuard` (global, `@Public()` opt-out), `RolesGuard`, register/login/refresh/logout. **Verified live**: full register→login→me→refresh flow + rate-limiting all confirmed against a real DB.
12. **Cities + Categories modules** — list+detail, Redis-cached lists, query-param filters.
13. **Storage + Email infra** — `StorageService`/`EmailService` interfaces behind factories (S3-compatible for MinIO/R2; SMTP for Maildev/prod), BullMQ `email` queue + processor + 3 typed templates (welcome, offer-received, offer-accepted). Fully typed job union (`EmailJob`), zero casts.
14. **Providers module** — entities' repositories, `ProvidersService` (create/update/delete with ownership checks, slug generation, Nominatim geocoding, `cities.provider_count` maintenance), `ProviderGalleryService` (S3 upload/delete), full controller + DTOs + mapper.

**A real bug was caught and fixed via live testing**: `CaseMapper` only converted plain object literals, not DTO class instances (`constructor === Object` check) — meaning every mapped response (`UserResponseDto`, etc.) was silently skipping snake_case conversion while ad hoc plain objects worked. Fixed + regression-tested (`case-mapper.spec.ts`).

## What's left

### Step 15 — Repair Requests module (in progress)
Done: `repair-requests.types.ts` (input/filter types), `RequestStatusTransitions` state machine + full unit test suite (all passing).
Still needed: `repair-requests.repository.ts` (custom, status+city+category+customer filtering, pagination — mirror `provider.repository.ts`'s branch-free dynamic-filter pattern), `repair-requests.service.interface.ts` + `.service.ts` (Create/FindById/List/UpdateStatus + internal `MarkOffersReceived`/`AcceptOffer` for Offers module to call), DTOs (`create-repair-request`, `update-repair-request-status`, `repair-request-response`, `list-repair-requests-query`), mapper, controller, module — wire into `app.module.ts`.

### Step 16 — Offers module (not started — highest business value remaining)
`OfferStatusTransitions` state machine (mirror the request one: pending→accepted/rejected/withdrawn, no backwards moves), entity repository, service with the key cross-entity rule: **accepting one offer must set `repair_requests.status = accepted` + `accepted_offer_id`, AND auto-reject every other pending offer on the same request** (call into `RepairRequestsService.AcceptOffer`). Enqueue `offer-received`/`offer-accepted` emails via `EmailQueueService`. Full DTOs/controller/module. This pairing (`OfferStatusTransitions` + `OffersService.Accept`) was flagged in the plan as the single most business-critical unit test in Phase 1 — don't skip it.

### Step 17 — Integration tests (not started)
2–3 `@testcontainers` specs per the plan: `database.integration-spec.ts` (real Postgres, run actual migrations, full entity round-trip incl. the circular FK), `redis.integration-spec.ts` (real Redis, cache hit/miss + a BullMQ job round-trip), optionally `auth-flow.integration-spec.ts` (full register→login→protected-route→refresh→429 HTTP flow). **Needs Docker** — see environment note below.

### Step 18 — Docker Compose verification (written but unverified)
`docker-compose.yml`, `Dockerfile`, `nginx/nginx.conf` are all written per the plan (api/postgres/redis/minio/maildev/nginx, dev-only postgres, edge/internal network split) but **never run** — this sandbox has no Docker daemon (`docker compose up` fails with "Cannot connect to the Docker daemon"). Needs a real `docker compose up` pass once you're in an environment with Docker, plus an `/health` check through nginx.

### Step 19 — Final pass (not started)
Full `tsc --noEmit` + full unit suite (currently 29/29 green) once steps 15–16 land, README update with the Phase 2/3 roadmap and the Postgres-dev-only note, `.env.example` double-check.

## Environment note for resuming (important)

This sandbox has **no Docker daemon**, so I couldn't use `docker compose up`. Instead I stood up throwaway local services to actually verify everything end-to-end rather than just trusting `tsc`:

- **Postgres**: a second, isolated PostgreSQL 17 cluster at `/tmp/claude-.../scratchpad/pgdata`, running on **127.0.0.1:55432** (started via `pg_ctl`, user `popravime`, db `popravime`) — separate from whatever system Postgres might be on 5432. Still running.
- **Redis**: extracted `redis-server` + `redis-cli` binaries straight from the Ubuntu `.deb` packages (plus `liblzf1`/`libjemalloc2` shared libs) into `/tmp/redis-extract`, running on default port **6379**. Still running.
- `.env` currently points `DATABASE_HOST=127.0.0.1` / `DATABASE_PORT=55432` to that scratch Postgres instead of the docker-compose default (`localhost:5432`) — **flip this back to `localhost:5432` (or whatever your real dev setup uses) once you're running via `docker compose up`**, since the scratch instances disappear when this sandbox session ends.
- Both were verified working together: migrations ran clean, seeds inserted correctly, and a full HTTP smoke test passed (register → login → `/users/me` → refresh → rate-limit 429 → `/health` reporting both `database` and `redis` up).

None of this scratch infrastructure is part of the repo or committed — it's purely how I verified the code in this session. In a normal dev machine with Docker, `docker compose up` should Just Work with the `.env.example` values filled in.

## Nothing has been committed to git yet
`git status` shows everything as untracked (`??`). No commits, no branch changes — that's deliberate, waiting for you to review before anything is committed.
