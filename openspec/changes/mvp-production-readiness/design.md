## Context

Audited the current `main` branch (commit `1ea09c2`) directly: `src/main.ts`, `src/app.module.ts`,
`src/config/*`, `src/database/*`, `docker-compose.yml`, `Dockerfile`, `nginx/nginx.conf`,
`src/modules/health/*`, `src/modules/infra/*`, `src/modules/auth/*`, `package.json`/`pnpm audit`,
and the full test suite. See proposal.md - Why for the summary; findings below are the full detail
this design responds to.

**Already in good shape (no change needed):** layered architecture with a domain exception
hierarchy and a single `DomainExceptionFilter` (`APP_FILTER`); global `JwtAuthGuard` + `@Public()`
opt-out; `RolesGuard` correctly applied class-level on `AdminController`; `helmet()`, `compression()`,
`app.set('trust proxy', 1)` and CORS already wired in `main.ts`; global `ValidationPipe` with
`whitelist`/`forbidNonWhitelisted`/`transform`; Joi env validation with `abortEarly: false`
covering every required var (DB, Redis, JWT, storage, email, admin bootstrap); Swagger docs
already gated to non-production (`config.nodeEnv !== 'production'`); Redis-backed
`ThrottlerGuard` applied globally plus a tighter `AUTH_THROTTLE` on register/login/refresh/logout/
oauth routes; `synchronize: false` in TypeORM options; `.env` correctly gitignored and never
committed; `pnpm audit --prod` reports zero known vulnerabilities; `GET /health` already checks
Postgres and Redis via Terminus; 136/136 unit tests pass; upload endpoints already enforce MIME
allow-lists and size limits (5MB images / 10MB documents) via Multer.

**Gaps this change closes**, in order of severity:
1. **Blocker** - no TLS on the Postgres connection anywhere (`database.config.ts`,
   `data-source-options.ts`, `data-source.ts` all omit `ssl`). Neon requires
   `sslmode=require`-equivalent behavior; without it the connection will be refused, so the app
   cannot boot against Neon at all today.
2. **Blocker** - `docker-compose.yml`'s `api` and `nginx` services are commented-out stubs; there
   is no runnable production topology yet, and `nginx/nginx.conf` only listens on port 80 with no
   TLS.
3. **Hardening** - `CORS_ORIGIN` empty/`*` means "allow any origin" per its own comment, which is
   explicitly documented as dev-only but nothing stops it from being left that way in prod.
4. **Hardening** - `S3StorageService.Upload` builds the object key as
   `${randomUUID()}-${input.fileName}` with the client-supplied `fileName` untouched, which can
   contain slashes, control characters, or excessive length.
5. **Operational gap** - no CI, no documented deploy/rollback runbook, and this repo has a known
   sharp edge (see project memory: bare `pnpm migration:run` batches all pending migrations into
   one transaction, which breaks when a migration adds a Postgres enum value consumed later in
   the same batch - `migration:run -t each` avoids it) that a deploy script must account for.

## Goals / Non-Goals

**Goals:**
- Make the app able to actually connect to Neon (TLS) and be exposed publicly (TLS termination),
  which today it cannot do at all.
- Close the CORS and upload-key hardening gaps identified in the audit.
- Produce a concrete, ordered runbook for a first production deploy on Hetzner + Neon +
  Cloudflare R2 + local Redis + nginx, using only infrastructure the user already has.

**Non-Goals:**
- No new business features or API changes.
- No CI/CD pipeline build-out (flagged as a recommendation in tasks.md, not required for this
  change's scope) - manual/scripted deploy is acceptable for an MVP first launch.
- No multi-region, autoscaling, or Kubernetes-style orchestration - single Hetzner VM via Docker
  Compose is the agreed target.
- No change to authentication/authorization logic beyond what's listed - the existing JWT/RBAC
  model is sound and out of scope.

## Decisions

**TLS to Neon via env-driven `ssl` option, not a hardcoded flag.**
`BuildDataSourceOptions` gains an optional `ssl` field on `DataSourceCredentials`
(`{ rejectUnauthorized: true } | false`), sourced from a new `DATABASE_SSL` env var
(default `false`, so local Compose Postgres is unaffected). Neon's own connection strings work
with `rejectUnauthorized: true` against its public CA, so no custom CA bundle is needed.
Alternative considered: parsing `sslmode` out of a single `DATABASE_URL` - rejected because this
repo already models discrete `DATABASE_HOST/PORT/USER/PASSWORD/NAME` vars everywhere (config,
`.env.example`, Joi schema); introducing a parallel URL-based path would be inconsistent with the
rest of `src/config/`.

**nginx handles TLS termination; Node never sees TLS directly.**
Standard shape: nginx terminates HTTPS on 443 (cert via certbot/Let's Encrypt, renewed via its own
timer on the Hetzner host), proxies plaintext to the `api` container on the internal Compose
network exactly as `nginx/nginx.conf` already does for port 3000. Alternative considered:
terminating TLS in Node (e.g., via a `https.createServer` wrapper) - rejected, this repo's own
standards fix nginx as the reverse proxy and terminating there is the conventional split
(cert lifecycle stays out of app deploys).

**`api`/`nginx` become real Compose services, `postgres` stays dev-only.**
Uncomment and finish the `api` service (build from the existing multi-stage `Dockerfile`,
`env_file: .env`, `depends_on` redis/minio/maildev-equivalents swapped for real endpoints in
prod via env, `restart: unless-stopped`, a healthcheck hitting `GET /health`) and the `nginx`
service (mount a prod nginx config, expose 80/443). `postgres` and `minio` service definitions in
`docker-compose.yml` are explicitly commented as "local development only" already and stay that
way - production points `DATABASE_HOST`/`STORAGE_ENDPOINT` at Neon/R2 instead, per this repo's
own §15 standard ("Postgres is only present via the compose image for local development").

**`docker-compose.override.yml` carries the local-only container wiring, not the base file.**
Discovered during implementation: the originally-sketched `api` service hardcoded
`DATABASE_HOST: postgres` / `STORAGE_ENDPOINT: http://minio:9000` / `EMAIL_HOST: maildev` in its
`environment:` block. Compose's `environment:` always wins over `env_file:`, so that would have
silently forced every deploy - including production - onto the local dev Postgres/MinIO/Maildev
container hostnames, overriding a real `.env`'s Neon/R2/SMTP values with no error. Fixed by
keeping `docker-compose.yml` production-safe (only `REDIS_HOST`/`PORT` pinned - Redis is a
sibling container in both modes per the user's own plan to run Redis locally in prod too;
`PORT` is pinned to `3000` so it can't drift from what the Dockerfile/nginx upstream expect) and
moving the container-hostname overrides plus the `postgres`/`minio`/`maildev` `depends_on`
entries into `docker-compose.override.yml`, which Compose auto-loads for local
`docker compose up --build` but which must not be deployed to (or must not exist on) the
production host. Verified live: `docker compose up -d --build api` (base file only) starts and
reports healthy against local Postgres/Redis with no override file involved in that check beyond
what's needed for local dependencies to exist.

**CORS allow-list enforced by fail-fast Joi validation, not runtime branching.**
Extend `EnvValidationSchema` so that when `NODE_ENV=production`, `CORS_ORIGIN` must be non-empty
and not `*` (Joi conditional via `.when()`). This reuses the existing "fail fast on invalid env"
mechanism (`ConfigModule.forRoot({ validationSchema, validationOptions: { abortEarly: false } })`)
instead of adding a second, separate runtime check - one source of truth for "is my config valid",
consistent with how every other required var is already enforced.

**Upload key sanitization is a small pure function, not a new class.**
`S3StorageService.Upload` slugifies/truncates `input.fileName` (strip anything but
`[A-Za-z0-9._-]`, collapse repeats, cap length) before concatenating it after the `randomUUID()`
prefix. Kept inline as a private helper in the same file rather than a new
calculator/transformer class - it's a single-branch, single-purpose string transform, not the
kind of multi-step mapping §9 reserves a dedicated class for.

**Dockerfile now copies `pnpm-workspace.yaml`.**
Discovered during implementation: `docker compose up -d --build api` failed at
`pnpm install --frozen-lockfile` with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. Root cause -
`pnpm-workspace.yaml` (which declares the `qs` security override the lockfile was generated
against) was never copied into either build stage, only `package.json`/`pnpm-lock.yaml` were.
Without it, pnpm inside the container sees no overrides and rejects the lockfile as
out-of-date. Fixed by adding `pnpm-workspace.yaml` to both `COPY` steps. This was a pre-existing
bug, unrelated to anything in the proposal, but it made the "Deployable container topology"
requirement's own image genuinely unbuildable, so it's fixed as part of this change rather than
filed separately.

**Deploy runbook lives in tasks.md as ordered steps, not a separate script initially.**
Given this is a first production deploy (no existing pipeline to slot into), the runbook is
written as an explicit, ordered checklist the user runs by hand on the Hetzner box. A
`deploy.sh`/Makefile wrapper is listed as a follow-up task, not a blocker for shipping.

## Risks / Trade-offs

- **[Risk]** `CORS_ORIGIN` fail-fast in production could brick a deploy if forgotten →
  **Mitigation**: the error is a clear Joi validation message at startup (never a silent
  wide-open CORS), and `.env.example`/the runbook call out the required value explicitly before
  first deploy.
- **[Risk]** Enabling `DATABASE_SSL` against a self-signed/misconfigured Postgres in some future
  environment could fail TLS verification → **Mitigation**: default is `false` (opt-in), and the
  runbook only turns it on for the Neon connection string, which presents a publicly trusted CA.
- **[Risk]** Hand-run deploy steps are error-prone compared to CI/CD → **Mitigation**: steps are
  written as a literal ordered checklist including the health-check gate (spec requirement) so a
  bad deploy is caught before old containers are torn down; CI is flagged as a near-term follow-up
  in tasks.md.
- **[Trade-off]** No blue/green or zero-downtime deploy on a single Hetzner VM - `docker compose
  up -d --no-deps --build api` causes a brief restart gap. Acceptable for an MVP's first launch;
  documented as a known limitation rather than solved now.

## Migration Plan

No data migration. Deploy sequencing (detailed step-by-step in tasks.md):
1. Ship the code/config changes (TLS config, Compose services, nginx TLS, CORS validation, upload
   sanitization) to `main` first, verified against local Compose exactly as today (`DATABASE_SSL`
   defaults to off locally, so no behavior change for local dev).
2. Provision Hetzner host, point DNS, obtain TLS cert.
3. Run database migrations against Neon (`migration:run -t each` - see project's migration
   transaction gotcha).
4. Bring up the Compose stack on the Hetzner host pointed at Neon/R2/local Redis.
5. Verify via `GET /health`, then cut DNS/traffic over.

**Rollback:** keep the previous Docker image tag; `docker compose up -d --no-deps` the previous
tag if the health check fails post-deploy. Neon supports point-in-time restore if a migration
needs reverting, in addition to this repo's own `migration:revert`.
