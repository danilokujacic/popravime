## Context

- The app already uses `nestjs-pino`/`pino`/`pino-http` (`src/shared/logger/pino.options.ts`,
  wired in `main.ts` via `app.useLogger(app.get(Logger))`) and already splits dev (pretty,
  single-line) vs. non-dev (structured JSON) formatting. Most services already inject
  `PinoLogger` via `@InjectPinoLogger` and log at meaningful branches (see `auth.service.ts`,
  `offers.service.ts`). There is no correlation ID anywhere yet, and no log aggregator — logs
  only exist as container stdout.
- Per `DEPLOY.md`, production is a single Hetzner VM running the whole stack via
  `docker compose up -d --build api nginx`, with only Redis as a local container alongside the
  app; Postgres/storage/email are all external managed services (Neon/R2/a real SMTP relay).
  There is no separate worker container — the BullMQ `email` queue's `EmailProcessor` runs
  in-process inside the same `api` container.
- The known incident this change targets: `SmtpEmailService.Send`
  (`src/modules/infra/email/smtp-email.service.ts`) calls `transporter.sendMail` with no
  try/catch and no logging of the outcome, and `EmailProcessor.process`
  (`src/modules/infra/email/email.processor.ts`) only logs before calling `Send` — a failed send
  either surfaces as a silent no-op or, if it throws, is invisible until BullMQ exhausts its 3
  retries with nothing recorded about why.
- The user chose the **Docker Loki logging driver** (over a promtail sidecar or an in-process
  Loki transport) to ship the `api` container's stdout to Loki — see proposal.md.

## Goals / Non-Goals

**Goals:**
- Self-hosted Loki + Grafana reachable only from the Hetzner VM's own network (matching the
  existing pattern of binding Postgres/Redis/MinIO to `127.0.0.1` in `docker-compose.yml`), fed
  by the `api` container's existing stdout JSON logs.
- One correlation ID per HTTP request, present on every log line produced while handling it, with
  zero extra plumbing needed in the many services that never cross an async boundary — only the
  one boundary that actually breaks propagation (the BullMQ email queue) gets explicit code.
- The email pipeline is diagnosable end-to-end from Grafana alone: enqueue → pickup → provider
  result (success detail or failure detail) → retry/exhaustion, all under one correlation ID.
- Observability additions never risk taking the app down if Loki itself is slow or unreachable.

**Non-Goals:**
- No distributed tracing/OpenTelemetry spans, no metrics/Prometheus, no alerting rules — this
  change is logs-only; dashboards are for manual investigation, not paging.
- No change to how email is actually delivered (still the Brevo SMTP relay via `nodemailer`,
  not a migration to Brevo's HTTP/SDK API) — only its observability.
- No public/internet-facing Grafana. Access is via SSH tunnel to the VM's loopback interface,
  same as any other admin-only tool on that host today.
- No separate worker container/process — the BullMQ processor's correlation handling is designed
  for it running in-process, as it does today.

## Decisions

### 1. Grafana + Loki as two new `docker-compose.yml` services, bound to loopback
Two services, `loki` and `grafana`, each with a persistent named volume (`lokidata`,
`grafanadata`), ports published as `127.0.0.1:4201:3100` and `127.0.0.1:4200:3000` (container-
internal ports unchanged — only the host-side mapping moved, off `3100`/`3000` onto `4201`/`4200`
after those collided with something already bound on the Hetzner host's loopback interface).
Grafana is pre-provisioned (via a mounted `grafana/provisioning/datasources/loki.yaml`) with the
Loki datasource so it works immediately without manual click-ops. Grafana admin credentials come
from `.env` (`GRAFANA_ADMIN_USER`/`GRAFANA_ADMIN_PASSWORD`), following the same pattern as every
other credential in this repo (§13 of coding standards — infra credentials live in `.env`, not
hardcoded).
- **Alternative considered**: expose Grafana through nginx with its own vhost/basic auth for
  browser access without an SSH tunnel. Rejected for now — it's more moving parts (another nginx
  location block, another TLS-adjacent auth surface) for a tool only the developer needs;
  revisit if Grafana needs to be shared with non-SSH-access teammates.

### 2. Shipping via the Docker Loki logging driver, in non-blocking mode
The `api` service's `logging:` block is set to the `loki` driver
(`loki-url: http://127.0.0.1:4201/loki/api/v1/push`, labeled with `job=popravime-api` and the
environment), installed once on the Hetzner host as a one-time step
(`docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions`,
documented in `DEPLOY.md`). Crucially, the driver options include `mode: non-blocking` with a
bounded `max-buffer-size` — Docker's Loki driver defaults to blocking, and a blocking driver
means a slow/unreachable Loki can stall the `api` container's log writes and, in the worst case,
the app itself. `docker-compose.yml` also gives the `api` service `depends_on: loki: condition:
service_healthy` so Loki is already accepting writes before the app starts.
- **Trade-off accepted**: attaching the `loki` driver replaces the container's default
  `json-file` driver — Docker only supports one logging driver per container — so
  `docker compose logs api` (used today in `DEPLOY.md` step 11's rollout verification) stops
  returning anything after this change. The migration plan below updates that verification step
  to query Loki instead.
- **Alternatives considered**: a promtail sidecar (rejected by the user — an extra container and
  scrape-config to maintain, for no behavioral benefit here); an in-process `pino` transport
  pushing straight to Loki's HTTP API (rejected by the user — couples the app process itself to
  Loki's availability and adds an app-level dependency for something Docker already does at the
  infra layer).

### 3. Correlation ID: reuse `nestjs-pino`'s existing per-request binding, add explicit propagation only across the BullMQ boundary
`pinoHttp.genReqId` in `BuildPinoOptions` is set to read an inbound `x-request-id` header when
present, otherwise generate a UUID, and to set that same value as the `x-request-id` response
header. Because `nestjs-pino` already keeps every `PinoLogger.*` call made during a request's
handling bound to that request's child logger (this is why `app.useLogger(app.get(Logger))` is
already wired in `main.ts`), every log line from auth, repair-requests, direct-inquiries, and
offers — none of which ever leave the request's own call chain — gets the correlation ID for
free, with **no code changes needed in those services beyond the logging-content additions
themselves**.

The one place this breaks is the BullMQ `email` queue: job processing happens on a later,
unrelated async chain, so `nestjs-pino`'s request-scoped binding does not reach it. The fix is
explicit, not automatic: `nestjs-cls` (`ClsModule`, one small Nest-idiomatic dependency built
exactly for this — reading request-scoped state from anywhere without Nest's own `REQUEST`
scope) is set up with its Express middleware storing `request.id` (already attached to the
request by `pino-http`) under a `correlationId` key. Wherever an email job is enqueued
(`AuthService`, `NotificationsService`), a plain singleton `ClsService.get('correlationId')`
read supplies the value for a new `correlationId` field on the `EmailJob` payload — no provider
needs `REQUEST` scope, so nothing about `AuthService`'s or `NotificationsService`'s own
lifecycle or their consumers changes. When `EmailProcessor.process` picks the job up, it does
**not** call `PinoLogger.assign()` to bind the
correlation ID for the rest of the method — `PinoLogger` instances are singletons per class, and
`assign()` mutates shared bindings, so under BullMQ worker concurrency (multiple jobs processed
concurrently) two interleaved jobs would clobber each other's correlation ID. Instead, every log
call in `EmailProcessor` and `SmtpEmailService` for that job explicitly includes
`{ correlationId: job.data.correlationId, ... }` as a field on the call itself, which is
concurrency-safe.
- **Alternatives considered**: a request-scoped provider reading `request.id` directly (no new
  dependency) — rejected because Nest's `REQUEST` scope cascades to every consumer up the
  injection graph, turning `AuthService`/`NotificationsService` and everything that injects them
  request-scoped (a new instance per request) purely to read one string; `nestjs-cls`'s
  BullMQ-specific plugin, which threads context through a queue more generically — not needed
  here since there is exactly one queue and the payload already carries other per-job context,
  so a single explicit `correlationId` field is simpler than adopting the plugin's own
  job-wrapping convention; revisit if a second queue is added and the manual-field approach
  starts feeling repetitive.

### 4. `EmailService.Send` reports a real outcome instead of `void`
`Send` returns `Promise<SendEmailResult>` (`{ accepted: string[]; rejected: string[]; messageId:
string | null }`) on success and rejects (throws) on failure, using nodemailer's own
`SentMessageInfo` (`accepted`/`rejected`/`messageId`) under the hood — `SmtpEmailService` already
gets this from `transporter.sendMail`'s resolved value, it just isn't read today.
`EmailProcessor.process` wraps the `Send` call in a try/catch: on success it logs the accepted
recipients and message ID; on failure it logs the provider error (code/message, never
credentials) before rethrowing so BullMQ's existing retry behavior (3 attempts, exponential
backoff, unchanged) still applies. A `failed` listener on the queue (`@OnWorkerEvent('failed')`)
logs final exhaustion once `job.attemptsMade >= job.opts.attempts`.

### 5. Retention
The Loki container is configured with a bounded retention period (default 30 days) via its
mounted config file's `limits_config`/compactor settings, so log storage on the single Hetzner
VM doesn't grow unbounded. This lives in a plain config file, not an app-level constant, so it
doesn't need the §13 "does this belong in `.env`" check — it's adjustable by editing that file
directly if the retention window needs to change.

## Risks / Trade-offs

- **[Risk]** Docker's Loki driver in blocking mode could stall the app if Loki is down →
  **Mitigation**: `mode: non-blocking` with a bounded buffer (decision 2); worst case under this
  mode is dropped log lines while Loki is unreachable, never a stalled app.
- **[Risk]** `docker compose logs api` silently stops working once the driver switches away from
  `json-file`, which could confuse whoever runs the existing `DEPLOY.md` rollout steps →
  **Mitigation**: migration plan below updates that step to a Loki query; also documented inline
  in `DEPLOY.md`.
- **[Risk]** The correlation ID is only as strong as every call site remembering to read it —
  a future email job kind added without threading `correlationId` through would silently lose
  correlation for that job type → **Mitigation**: `correlationId` is a required (non-optional)
  field on the shared `EmailJob` payload shape, so TypeScript itself rejects an enqueue call that
  omits it.
- **[Risk]** Loki/Grafana add two more containers' worth of operational surface (disk, restart
  policy, upgrades) to a single-VM deployment that already has no redundancy →
  **Mitigation**: bounded retention (decision 5) and `restart: unless-stopped` keep this in line
  with every other service already in `docker-compose.yml`; this is an accepted trade-off of
  self-hosting rather than using a managed log service, consistent with the user's stated
  self-hosted requirement.

## Migration Plan

1. On the Hetzner host (one-time, imperative, documented in `DEPLOY.md` next to the existing
   certbot step): install the Loki Docker logging driver plugin.
2. Add `GRAFANA_ADMIN_USER`/`GRAFANA_ADMIN_PASSWORD` to the host's `.env`.
3. Ship the updated `docker-compose.yml` (new `loki`/`grafana` services + volumes, `logging:`
   block on `api`) and the new `grafana/provisioning/` directory.
4. `docker compose up -d loki grafana`, wait for both healthy, then
   `docker compose up -d --build api` so the app container picks up the new logging driver.
5. Replace `DEPLOY.md` step 11's `docker compose logs api` check with a Grafana Explore query
   (`{job="popravime-api"}`) or `logcli query '{job="popravime-api"}'` against Loki.
6. Smoke test (extends `DEPLOY.md` step 12): register/log in a test user, note the
   `x-request-id` response header, and confirm every log line for that flow appears in Grafana
   under that same value; separately, temporarily misconfigure `EMAIL_PASSWORD` to force one
   failed send and confirm the failure — provider error code, rejected recipient, no leaked
   credential — is visible in Grafana.
7. **Rollback**: this change is purely additive to infra and logging content — no data
   migration, no schema change. Reverting `docker-compose.yml` to drop the `loki`/`grafana`
   services and the `api` logging driver override, then redeploying, fully reverts it; the app
   has no runtime dependency on Loki/Grafana being present (per the non-blocking driver mode).

## Open Questions

- Exact Loki retention window (default 30 days, decision 5) can be tuned later purely by editing
  Loki's config file — doesn't change any spec, approach, or task.
- Whether to eventually add Prometheus metrics/alerting on top of these logs is explicitly out of
  scope here (Non-Goals) and can be proposed as a separate change later without touching this
  one's specs.
