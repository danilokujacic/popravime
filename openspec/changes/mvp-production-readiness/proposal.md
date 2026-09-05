## Why

The backend is feature-complete enough for an MVP (27 modules, 136 passing unit tests, layered
architecture, JWT auth, rate limiting, structured logging) but has never been deployed. A
production-readiness audit found one connectivity blocker (no TLS on the Postgres connection,
which Neon requires and will refuse without) and several hardening gaps (no HTTPS/TLS
termination config, a `docker-compose.yml` whose `api`/`nginx` services are still commented out,
permissive CORS/security-header defaults, unsanitized upload filenames, no backup or rollback
procedure) that should be closed before the app is exposed to real users on the target stack
(Hetzner VM + Cloudflare R2 + Neon Postgres + local Redis + nginx).

## What Changes

- Enable TLS on the TypeORM/Postgres connection (required by Neon; currently absent — connection
  attempts to Neon will fail).
- Un-comment and productionize the `api` and `nginx` services in `docker-compose.yml` (build
  context, env wiring, restart policy, healthchecks, resource limits).
- Add TLS/HTTPS termination to the nginx config (Let's Encrypt/certbot or equivalent), plus
  standard hardening: server tokens off, request size limit already present, upstream
  keepalive, gzip, and forwarding of `X-Forwarded-*` headers already present.
- Tighten `CORS_ORIGIN` handling for production (empty/`*` currently means "allow any origin,
  dev only" per its own comment — must be a concrete allow-list in prod) and confirm Swagger
  docs stay disabled outside `development`/`test` (already the case — verified, not changed).
- Sanitize/bound uploaded file names before they become part of the R2/S3 object key in
  `S3StorageService.Upload` (currently concatenates the raw client-supplied filename).
- Document and, where missing, script the operational basics needed for a safe first deploy:
  environment variable checklist per host (Hetzner app env vs. Neon vs. R2), migration-on-deploy
  step (`migration:run -t each` per this repo's own transaction gotcha with enum-adding
  migrations), health-check based rollout verification (`GET /health` already checks DB + Redis),
  and a basic backup/rollback story (Neon point-in-time restore + tagged Docker images).
- **BREAKING**: none — all changes are additive/config-level; no public API contract changes.

## Capabilities

### New Capabilities
- `production-deployment`: Requirements the system and its deployment configuration must meet to
  run safely in production on Hetzner + Neon + Cloudflare R2 + nginx (TLS to the database, TLS
  termination at the edge, CORS allow-listing, container/orchestration wiring, upload key
  safety, health-check-gated rollout).

### Modified Capabilities
(none — no existing `openspec/specs/` capabilities exist yet in this repo; this is the first
capability spec)

## Impact

- `src/config/database.config.ts`, `src/database/data-source-options.ts`, `src/database/data-source.ts`
  — add `ssl` option, sourced from env.
- `src/config/env.validation.ts`, `.env.example` — add `DATABASE_SSL`/related env var(s).
- `docker-compose.yml` — uncomment and finish `api` and `nginx` service definitions.
- `nginx/nginx.conf` (or a new `nginx/nginx.prod.conf`) — TLS termination + hardening.
- `src/modules/infra/storage/s3-storage.service.ts` — sanitize `fileName` used in object keys.
- `src/config/app.config.ts` — no code change expected, but production `CORS_ORIGIN` value must
  be set to a concrete origin list (operational/config change, captured as a deploy-time
  requirement, not a code change).
- New: a deploy runbook (captured in `design.md`/`tasks.md`) covering the Hetzner + Neon +
  Cloudflare R2 + local Redis + nginx rollout, step by step.
- No changes to existing REST endpoints, DTOs, or business logic.
