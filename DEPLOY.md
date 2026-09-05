# Production Deploy Runbook

Target stack: **Hetzner** VM (Docker Compose) + **Neon** Postgres + **Cloudflare R2** (S3-compatible
object storage) + a **local Redis** container on the Hetzner VM + **nginx** as the reverse proxy /
TLS terminator.

This assumes `docker-compose.yml`'s `api`/`nginx` services and `nginx/nginx.conf`'s TLS
termination (see `openspec/changes/mvp-production-readiness/`) are already merged.

## 1. Neon (Postgres)

1. Create the production project/database and a dedicated app role + password (don't reuse a
   personal/admin Neon role for the app connection).
2. Note `host`, `port` (usually `5432`), `database`, `user`, `password`. Neon requires TLS by
   default — this app now supports that via `DATABASE_SSL=true` (see §6).

## 2. Cloudflare R2 (object storage)

1. Create the production bucket.
2. Create an R2 API token scoped to that bucket (access key + secret key).
3. Set up either the bucket's public dev URL or a custom domain for public reads, and note it as
   `STORAGE_PUBLIC_URL`.
4. Note the S3-compatible endpoint as `STORAGE_ENDPOINT` (the account-level R2 endpoint, e.g.
   `https://<account-id>.r2.cloudflarestorage.com`).

## 3. Hetzner (VM)

1. Provision the VM, install Docker + the Docker Compose plugin.
2. Firewall: allow only `22` (SSH), `80` (HTTP, for ACME + the HTTPS redirect), and `443`
   (HTTPS). Everything else (Postgres/Redis/MinIO ports the local compose file also exposes)
   should not be reachable from outside the VM.
3. Create a non-root deploy user with SSH key auth; disable password SSH login.
4. Clone the repo onto the VM (or push a built image — either way, `docker-compose.yml` and
   `nginx/nginx.conf` need to be present on the host).

## 4. DNS

Point the production domain's A/AAAA record at the Hetzner VM's IP. If proxying through
Cloudflare, decide up front whether Cloudflare or this nginx terminates TLS — the cert setup
below assumes nginx on the VM does it (Cloudflare in "DNS only" mode, not proxied, for that
domain/record — or in "Full (strict)" mode if proxied).

## 5. TLS certificate

On the Hetzner host (not in a container):

```bash
sudo apt-get install certbot
mkdir -p /path/to/popravime/certbot-webroot
sudo certbot certonly --webroot \
  -w /path/to/popravime/certbot-webroot \
  -d your-domain.tld
```

This writes the cert to `/etc/letsencrypt/live/your-domain.tld/`, which `docker-compose.yml`
already bind-mounts read-only into the `nginx` container. Confirm renewal is automated
(certbot's own systemd timer/cron, already installed by the package on most distros):

```bash
sudo systemctl list-timers | grep certbot
```

In `nginx/nginx.conf`, replace every `YOUR_DOMAIN` placeholder with `your-domain.tld` (must match
the cert exactly).

## 6. Secrets (`.env` on the host — never committed)

Copy `.env.example` to `.env` on the Hetzner host and fill in real values:

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_HOST`/`PORT`/`USER`/`PASSWORD`/`NAME` | From Neon (§1) |
| `DATABASE_SSL` | `true` (Neon requires TLS) |
| `REDIS_PASSWORD` | A fresh strong password (the compose `redis` service reads this) |
| `STORAGE_*` | From Cloudflare R2 (§2) |
| `JWT_SECRET` / `REFRESH_SECRET` | Freshly generated, ≥16 chars each — **not** the repo's dev defaults |
| `CORS_ORIGIN` | The real frontend origin(s), comma-separated. Required and must not be empty/`*` — the app now fails fast at boot in production if this is missing (see spec: Production CORS allow-list) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin account credentials |
| `EMAIL_*` | A real SMTP relay — not Maildev |
| `PORT` | Leave unset (defaults to `3000`) — nginx's upstream is hardcoded to port 3000 inside the Docker network |

## 7. Local infra on the VM

Only Redis runs as a local container in production (Postgres/MinIO/Maildev stay dev-only, per
`docker-compose.yml`'s own comments — production points at Neon/R2/a real SMTP relay instead):

```bash
docker compose up -d redis
```

## 8. Run migrations against Neon

```bash
pnpm typeorm -- migration:run -t each
```

Use `-t each` (one transaction per migration), **not** the bare `migration:run` — this repo has
migrations that add a Postgres enum value and consume it later; batching every pending migration
into a single transaction breaks on that pattern.

## 9. Seed the admin account

```bash
pnpm seed:run
```

Idempotent — safe to re-run.

## 10. Bring up the stack

```bash
docker compose up -d --build api nginx
```

(Postgres/MinIO/Maildev are not started in production — `docker-compose.override.yml` is
dev-only and should not be deployed to the Hetzner host, or should simply not exist there.)

## 11. Verify the rollout

```bash
curl https://your-domain.tld/health
```

Expect `"status":"ok"` with both `database` and `redis` reporting `"up"`. Also check:

```bash
docker compose logs api
```

for a clean startup with no Joi env-validation errors. Treat a failing health check as a failed
rollout — don't consider the deploy live (see spec: Health-check-gated rollout).

## 12. Smoke test

Register a test user, log in, and make one authenticated request end-to-end through
nginx → api → Neon/Redis/R2 (e.g. upload a provider gallery image and confirm it's readable from
`STORAGE_PUBLIC_URL`).

## 13. Rollback

- Tag Docker images by git SHA before each deploy so the previous image is always available.
- If the health check or smoke test fails: `docker compose up -d --no-deps` the previous image
  tag for `api` and investigate before retrying.
- If a migration needs reverting: `pnpm typeorm -- migration:revert`, or fall back to Neon's
  point-in-time restore for data-level issues.

## Known limitation

A single Hetzner VM with `docker compose up -d --build api` is not zero-downtime — there's a
brief restart gap while the new `api` container starts. Acceptable for an MVP's first launches;
revisit (blue/green, a second VM, etc.) if downtime during deploys becomes a problem.
