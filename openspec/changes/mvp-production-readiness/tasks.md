## 1. Database TLS (Neon connectivity blocker)

- [x] 1.1 Add `DATABASE_SSL` (boolean, default `false`) to `EnvValidationSchema` and `.env.example`, with a comment that Neon requires it `true`
- [x] 1.2 Add `ssl?: boolean` to `DatabaseConfig`/`DatabaseCredentials` and wire it from `DATABASE_SSL` in `src/config/database.config.ts`
- [x] 1.3 In `BuildDataSourceOptions` (`src/database/data-source-options.ts`), set `ssl: credentials.ssl ? { rejectUnauthorized: true } : false` and verify `npx tsc --noEmit` passes
- [x] 1.4 Pass the same option through `src/database/data-source.ts` (CLI data source used by `migration:run`) so migrations can also run against Neon
- [ ] 1.5 Verify: run the existing `test/integration/database.integration-spec.ts` against local Compose Postgres with `DATABASE_SSL=false` (unchanged behavior), then manually verify a connection against a real Neon instance with `DATABASE_SSL=true` succeeds (`pnpm typeorm -- migration:show` or equivalent) — **local leg done** (`database.integration-spec.ts` passes with `DATABASE_SSL` unset); **live-Neon leg not done**, no Neon credentials available in this environment — will be exercised for real during deploy step 7.11

## 2. Production CORS allow-list

- [x] 2.1 Extend `EnvValidationSchema` so `CORS_ORIGIN` is required and must not be empty/`*` when `NODE_ENV=production` (Joi `.when()`), verified by a new case in the config/env validation spec test
- [x] 2.2 Verify: app fails fast at boot with `NODE_ENV=production` and `CORS_ORIGIN` unset (manual `node dist/main` smoke test or a unit test around `EnvValidationSchema.validate(...)`), and boots normally with a concrete origin list — done via unit test (`src/config/env.validation.spec.ts`)

## 3. Upload key sanitization

- [x] 3.1 Add a private sanitizer in `src/modules/infra/storage/s3-storage.service.ts` that strips/replaces characters outside `[A-Za-z0-9._-]` and caps length before the file name is appended to the generated key
- [x] 3.2 Update/add a unit test for `S3StorageService.Upload` covering a file name with path separators, unicode, and excessive length, verifying the resulting key is safe and the test passes

## 4. Docker Compose production topology

- [x] 4.1 Uncomment and finish the `api` service in `docker-compose.yml`: build from `Dockerfile`, `restart: unless-stopped`, `env_file: .env`, correct `depends_on` health conditions, and a healthcheck against `GET /health` — also fixed a real build blocker found along the way: the `Dockerfile` never copied `pnpm-workspace.yaml`, so `pnpm install --frozen-lockfile` failed on the `overrides` mismatch; added it to both `COPY` steps. Also split the container-hostname wiring (`DATABASE_HOST=postgres` etc.) into `docker-compose.override.yml` (dev-only) so a real `.env`'s Neon/R2/SMTP values are never silently overridden in production — see design note below
- [x] 4.2 Uncomment and finish the `nginx` service: mount the production nginx config, expose `80:80` and `443:443`, mount the TLS cert/key volume (or the certbot webroot), `depends_on: [ api ]`
- [x] 4.3 Verify: `docker compose config` validates without errors and `docker compose up -d` brings up `api` behind `nginx` locally reachable on `http://localhost` — `docker compose config` validates; brought up `api` for real via `docker compose up -d --build api` and it reported `healthy` against the local Postgres/Redis containers. The literal `nginx` compose service couldn't be started here because port 80 on this dev machine is already bound by an unrelated process, so nginx itself was verified as a standalone container attached to the same Docker network with the real config (see task 5.3)

## 5. nginx TLS termination

- [x] 5.1 Add an HTTP server block that redirects all traffic to HTTPS (keep the ACME/certbot challenge path served over plain HTTP)
- [x] 5.2 Add an HTTPS server block on 443 with `ssl_certificate`/`ssl_certificate_key`, `server_tokens off;`, and the existing proxy settings (Host/X-Real-IP/X-Forwarded-For/X-Forwarded-Proto) carried over from the current config
- [x] 5.3 Verify: `nginx -t` against the new config succeeds (can be run inside the `nginx:alpine` image with the config mounted) — verified `nginx -t` passes with a throwaway self-signed cert, and end-to-end: HTTP request got a 301 to HTTPS, and an HTTPS request through nginx reached the live `api` container's `/health` (`database`/`redis` both up), confirming the full proxy + TLS chain works, not just config syntax

## 6. Verification pass

- [x] 6.1 Run `npx jest --silent` and confirm all suites (including the 3 new/updated cases above) pass — 29 suites / 145 tests pass
- [x] 6.2 Run `npx tsc --noEmit` and confirm no type errors — clean
- [x] 6.3 Run `pnpm audit --prod` and confirm no new vulnerabilities were introduced by any dependency changes (none expected - no new deps needed for this change) — "No known vulnerabilities found"
- [ ] 6.4 Re-check the health endpoint requirement: confirm `GET /health` still reports `database`/`redis` indicators with `DATABASE_SSL=true` set locally against a real Neon connection — not done, no Neon credentials available in this environment; deferred to deploy step 7.11, which performs this exact check

## 7. Production deploy runbook (Hetzner + Neon + Cloudflare R2 + local Redis + nginx)

- [ ] 7.1 **Neon**: create the production database and a dedicated app role/password; copy the host/db/user/password and confirm the connection string requires TLS (Neon does by default)
- [ ] 7.2 **Cloudflare R2**: create the production bucket, an API token scoped to that bucket (access key + secret), and either a public bucket dev-URL or a custom domain for `STORAGE_PUBLIC_URL`; note the S3-compatible endpoint for `STORAGE_ENDPOINT`
- [ ] 7.3 **Hetzner**: provision the VM (Docker + Docker Compose installed), open firewall ports 22/80/443 only, create a non-root deploy user with SSH key access
- [ ] 7.4 **DNS**: point the production domain's A/AAAA record at the Hetzner VM's IP (through Cloudflare if using its proxy, or direct — confirm which before requesting a cert)
- [ ] 7.5 **TLS certificate**: obtain a Let's Encrypt certificate for the domain (certbot in standalone/webroot mode, or Cloudflare-issued if terminating TLS at Cloudflare instead — pick one and keep it consistent with the nginx config from task 5); confirm renewal is automated (systemd timer/cron)
- [ ] 7.6 **Secrets**: write the production `.env` on the Hetzner host (never committed) with real `DATABASE_HOST/PORT/USER/PASSWORD/NAME` (Neon), `DATABASE_SSL=true`, `REDIS_*` (local container), `STORAGE_*` (R2), `JWT_SECRET`/`REFRESH_SECRET` (fresh, ≥16 chars, generated for prod — not the dev defaults), `CORS_ORIGIN` (the real frontend origin(s)), `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `EMAIL_*` (real SMTP relay, not Maildev), `NODE_ENV=production`
- [ ] 7.7 **Local infra on the VM**: bring up `redis` (with `REDIS_PASSWORD` set — do not run Postgres or MinIO in prod per `docker-compose.yml`'s own dev-only comments; those point at Neon/R2 instead)
- [ ] 7.8 **Migrations**: run `pnpm typeorm -- migration:run -t each` against Neon before starting the app (per this repo's own migration-transaction gotcha — never the bare `migration:run` for a batch that adds and then uses a Postgres enum value)
- [ ] 7.9 **Seed the admin account**: run `pnpm seed:run` once against Neon to create the bootstrap admin idempotently
- [ ] 7.10 **Bring up the stack**: `docker compose up -d --build` for `api` and `nginx` (Postgres/MinIO/Maildev services stay down in prod)
- [ ] 7.11 **Verify the rollout**: `curl https://<domain>/health` reports overall `"status":"ok"` with `database` and `redis` both `"up"` before considering the deploy live; check container logs (`docker compose logs api`) for clean startup with no Joi validation errors
- [ ] 7.12 **Smoke test**: register a test user, log in, and confirm an authenticated request succeeds end-to-end through nginx → api → Neon/Redis/R2
- [ ] 7.13 **Rollback plan**: tag Docker images by git SHA before each deploy; if the health check or smoke test fails, `docker compose up -d --no-deps` the previous image tag for `api` and investigate; keep `migration:revert` and Neon's point-in-time restore as the data-level fallback
- [x] 7.14 Document the above as a `DEPLOY.md` (or extend `README.md`) so the next deploy doesn't require re-deriving these steps — written as `DEPLOY.md`, linked from `README.md`
