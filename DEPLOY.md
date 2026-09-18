# Production Deploy Runbook

Target stack: **Hetzner** VM (Docker Compose for the app + its infra) + **Neon** Postgres +
**Cloudflare R2** (S3-compatible object storage) + a **local Redis** container on the Hetzner
VM + the **host's own nginx** (installed directly on the VM, not containerized) as the reverse
proxy / TLS terminator + self-hosted **Loki**/**Grafana** for logs + self-hosted
**Prometheus**/**node-exporter**/**cadvisor** for resource metrics, with Grafana Alerting emailing
out on high CPU/memory/disk or a spike in application error logs.

This assumes `docker-compose.prod.yml`'s `api` service and `nginx/nginx.conf` (installed into
the host's nginx — see §5) are already in place.

Production and local dev now live in two separate compose files — `docker-compose.prod.yml`
(api, redis, loki, grafana — everything Docker-based this runbook deploys; nginx runs on the
host outside Docker) and `docker-compose.yml` (postgres, redis, minio, maildev — local dev infra
only, not deployed here). Every `docker compose` command below targets the former with
`-f docker-compose.prod.yml`.

> Historical note: an `api`/`nginx`-in-Docker setup briefly didn't exist in this repo's compose
> setup at all — added by `mvp-production-readiness`, then deleted by a later "fix" commit
> (`c1e2b79`) along with the `edge` network. `api` was restored into `docker-compose.prod.yml`;
> `nginx` was deliberately left out of it in favor of the host's already-installed nginx instead.

## 1. Neon (Postgres)

1. Create the production project/database and a dedicated app role + password (don't reuse a
   personal/admin Neon role for the app connection).
2. Note `host`, `port` (usually `5432`), `database`, `user`, `password`. Neon requires TLS by
   default — this app now supports that via `DATABASE_SSL=true` (see §6).

## 2. Cloudflare R2 (object storage)

Two buckets, because R2 makes public access a per-bucket setting:

1. Create the **public** bucket (provider gallery images only) and set up either its public dev
   URL or a custom domain for public reads, noted as `STORAGE_PUBLIC_URL`. Env: `STORAGE_BUCKET`.
2. Create the **private** bucket (repair-request photos, message attachments, verification
   documents). Leave public access **off**: no `r2.dev` URL, no custom domain. Env:
   `STORAGE_PRIVATE_BUCKET`. The API serves these files through short-lived signed links
   (`STORAGE_SIGNED_URL_TTL_SECONDS`, default 1 hour).
3. Create one R2 API token with read/write access to **both** buckets (access key + secret key).
4. Note the S3-compatible endpoint as `STORAGE_ENDPOINT` (the account-level R2 endpoint, e.g.
   `https://<account-id>.r2.cloudflarestorage.com`). Signed links are issued against this
   endpoint, so the frontend must allow its host as an image source (`NEXT_PUBLIC_PRIVATE_FILES_ORIGIN`).

### Moving uploads that already exist into the private bucket

Run once, after the new backend with `STORAGE_PRIVATE_BUCKET` is deployed (old rows keep working
from the public bucket until then):

```
pnpm storage:privatize -- --dry-run   # prints how many rows/objects it would move
pnpm storage:privatize                # copies to the private bucket, rewrites the rows, deletes the public copy
```

It is idempotent. If it lists objects "STILL in the public bucket", delete them by hand in the R2
dashboard. Afterwards the public bucket should contain gallery images only.

## 3. Hetzner (VM)

1. Provision the VM, install Docker + the Docker Compose plugin.
2. Firewall: allow only `22` (SSH), `80` (HTTP, for ACME + the HTTPS redirect), and `443`
   (HTTPS). Everything else (Postgres/Redis/MinIO/Loki/Grafana/Prometheus/node-exporter/cadvisor
   ports the compose files publish) should not be reachable from outside the VM — every one of
   them is bound to `127.0.0.1` in `docker-compose.prod.yml`. Grafana in particular is reached
   over an SSH tunnel (`ssh -L 4200:127.0.0.1:4200 you@your-domain.tld`, then
   `http://localhost:4200` locally; tunnel `9090` too if you want to query Prometheus directly),
   never opened on the firewall.
3. Create a non-root deploy user with SSH key auth; disable password SSH login.
4. Clone the repo onto the VM (or push a built image — either way, `docker-compose.prod.yml` and
   `nginx/nginx.conf` need to be present on the host).

## 4. DNS

Point the production domain's A/AAAA record at the Hetzner VM's IP. If proxying through
Cloudflare, decide up front whether Cloudflare or this nginx terminates TLS — the cert setup
below assumes nginx on the VM does it (Cloudflare in "DNS only" mode, not proxied, for that
domain/record — or in "Full (strict)" mode if proxied).

## 4a. Loki logging driver (one-time host setup)

The `api` service ships its logs to the self-hosted `loki` container via Docker's own Loki
logging driver rather than a sidecar or an in-process transport — see
`openspec/changes/add-grafana-loki-observability/design.md` decision 2. Install the driver
plugin once on the Hetzner host:

```bash
docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions
```

`docker-compose.prod.yml`'s `api` service already has this `logging:` block — shown here for
reference:

```yaml
  api:
    # ...existing config...
    depends_on:
      redis:
        condition: service_healthy
      loki:
        condition: service_healthy
    logging:
      driver: loki
      options:
        loki-url: 'http://127.0.0.1:4201/loki/api/v1/push'
        loki-external-labels: 'job=popravime-api,env=production'
        mode: non-blocking
        max-buffer-size: 4m
```

`mode: non-blocking` matters — without it, a slow or unreachable Loki can stall the `api`
container's log writes (worst case, the app itself). Under this mode, the worst case if Loki is
down is dropped log lines, never a stalled app.

Because this block is always active, `docker compose logs api` (the default `json-file` driver's
command) never returns anything — Docker only supports one logging driver per container. §11's
verification step uses a Loki query instead.

## 5. TLS certificate

Since nginx runs directly on the host here (not in Docker), this is regular host-nginx + certbot
setup — no bind mounts, no webroot shared with a container:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.tld
```

(`--nginx` edits the host's nginx config and reloads it automatically; if you'd rather manage the
cert issuance separately from nginx's config, `certbot certonly --webroot -w <your webroot> -d
your-domain.tld` works the same as before, just against whatever webroot your existing nginx
setup already serves `.well-known/acme-challenge/` from.) Confirm renewal is automated (certbot's
own systemd timer/cron, already installed by the package on most distros):

```bash
sudo systemctl list-timers | grep certbot
```

Install `nginx/nginx.conf` from this repo into the host's nginx (e.g.
`/etc/nginx/sites-available/popravime`, symlinked into `sites-enabled`) if you haven't already,
merging it with whatever else that host's nginx already serves. Replace every `YOUR_DOMAIN`
placeholder with `your-domain.tld` (must match
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
| `PORT` | Leave unset (defaults to `3000`) — `docker-compose.prod.yml` publishes it on `127.0.0.1:3000`, which the host nginx's upstream points at |
| `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` | Admin login for the self-hosted Grafana container — freshly generated, not the `.env.example` default |
| `ALERT_EMAIL_TO` | Where Grafana sends resource/error alert emails — e.g. `danilo.kujacic01@gmail.com` |

## 7. Local infra on the VM

Redis, Loki, Grafana, Prometheus, node-exporter, and cadvisor all run as local containers in
production (Postgres/MinIO/Maildev live only in `docker-compose.yml`, the local-dev file —
production points at Neon/R2/a real SMTP relay instead):

```bash
docker compose -f docker-compose.prod.yml up -d redis loki node-exporter cadvisor prometheus grafana
```

Bring these up **before** `api` (§10) — `depends_on: loki/prometheus: condition: service_healthy`
on `api`/`grafana` needs both already up. After Grafana starts, open it over the SSH tunnel
(§3) and check **Alerting → Alert rules** for the four rules in
`grafana/provisioning/alerting/rules.yaml` (High CPU usage, High memory usage, Low disk space,
High application error rate) — confirm each shows "Normal" with no provisioning/parse error, and
send a test notification from **Alerting → Contact points → ops-email** to confirm mail actually
reaches `ALERT_EMAIL_TO` through the Brevo relay. This file was written against Grafana 10.4.2's
documented alert-provisioning schema but not exercised against a live instance before being
committed — treat this check as required, not optional, on first deploy.

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
docker compose -f docker-compose.prod.yml up -d --build
```

This brings up `api` (plus `redis`/`loki`/`grafana`) — not nginx, which isn't a service in this
file; reload/restart the host's own nginx separately if you just changed its config
(`sudo nginx -t && sudo systemctl reload nginx`).

(Postgres/MinIO/Maildev don't exist in `docker-compose.prod.yml` at all — they're only ever in
`docker-compose.yml`, the local-dev file, which should not be deployed to the Hetzner host, or
should simply not exist there.)

## 11. Verify the rollout

```bash
curl https://your-domain.tld/health
```

Expect `"status":"ok"` with both `database` and `redis` reporting `"up"`. Also check for a clean
startup with no Joi env-validation errors:

Query Loki for it (the Loki logging driver in §4a means `docker compose logs api` never returns
anything):
`docker compose -f docker-compose.prod.yml exec loki wget -qO- 'http://localhost:3100/loki/api/v1/query_range?query={job="popravime-api"}'`,
or open Grafana (over the SSH tunnel from §3) and use Explore with the same query.

Treat a failing health check as a failed rollout — don't consider the deploy live (see spec:
Health-check-gated rollout).

## 12. Smoke test

Register a test user, log in, and make one authenticated request end-to-end through
nginx → api → Neon/Redis/R2 (e.g. upload a provider gallery image and confirm it's readable from
`STORAGE_PUBLIC_URL`).

If the Loki driver (§4a) is attached, also: note the `x-request-id` response header from the
login request, and confirm every log line for that request shows up in Grafana (Explore,
`{job="popravime-api"} | json | correlationId = "<that value>"`) under it; separately,
temporarily misconfigure `EMAIL_PASSWORD`, trigger one email send (e.g. resend a confirmation
email), and confirm the failure — provider error code, rejected recipient, no leaked credential
— is visible the same way.

## 13. Rollback

- Tag Docker images by git SHA before each deploy so the previous image is always available.
- If the health check or smoke test fails: `docker compose -f docker-compose.prod.yml up -d
  --no-deps` the previous image tag for `api` and investigate before retrying.
- If a migration needs reverting: `pnpm typeorm -- migration:revert`, or fall back to Neon's
  point-in-time restore for data-level issues.
- Loki/Grafana/Prometheus/node-exporter/cadvisor are purely additive observability — dropping
  those services and the `api` logging driver override, then redeploying, fully reverts that
  piece with no data migration involved; the app has no runtime dependency on any of them being
  up (§4a's `mode: non-blocking` covers Loki; `api` never talks to Prometheus/Grafana at all).

## Known limitation

A single Hetzner VM with `docker compose -f docker-compose.prod.yml up -d --build api` is not
zero-downtime — there's a brief restart gap while the new `api` container starts. Acceptable for
an MVP's first launches; revisit (blue/green, a second VM, etc.) if downtime during deploys
becomes a problem.
