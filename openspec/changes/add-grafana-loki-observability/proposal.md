## Why

Production incidents are currently invisible: logs only exist as ad-hoc `nestjs-pino` lines
scattered across `docker compose logs api`, there is no way to tie the log lines from one
request (or one background job) together, and the one incident we already know about —
transactional email not arriving via the Brevo SMTP relay — can't be diagnosed because
`SmtpEmailService.Send` swallows the outcome of `transporter.sendMail` with no success/failure
logging at all. We need a self-hosted Grafana + Loki stack to store and query structured logs,
a correlation ID that ties every log line of one end-to-end flow together (HTTP request →
service calls → queued job → external call), and complete, correlated logging of every
business-critical flow (auth, repair requests, direct inquiries, offers, email delivery) so an
incident can be diagnosed from Grafana alone, without reproducing it.

## What Changes

- Add self-hosted **Loki** and **Grafana** containers to `docker-compose.yml`, with a Loki
  datasource pre-provisioned in Grafana and a persistent volume for each.
- Ship the `api` container's stdout logs to Loki via the **Docker Loki logging driver**
  (`loki-docker-driver` Docker plugin, installed once on the Hetzner host) — no promtail
  sidecar, no in-process Loki transport. The app keeps writing structured JSON to stdout in
  production exactly as it does today (`nestjs-pino`, `BuildPinoOptions`); only the shipping
  mechanism is new.
- Keep the existing dev-vs-prod split in `BuildPinoOptions` (pretty, single-line console output
  in development; structured JSON in production) and formalize it as a spec requirement instead
  of an implicit implementation detail.
- Introduce a **correlation ID** generated per inbound HTTP request (reusing an inbound
  `x-request-id` header when the caller supplies one), bound to every log line emitted during
  that request via `nestjs-pino`'s async-context binding, and returned on the response so a
  client/support ticket can reference it.
- Propagate the correlation ID across the one async boundary that breaks it today: BullMQ email
  jobs. The ID is captured at enqueue time, carried on the job payload, and re-bound to every log
  line the `EmailProcessor` and `SmtpEmailService` emit while handling that job — so a request
  and the email it triggered show up under the same correlation ID in Loki even though the job
  runs after the HTTP response already returned.
- Make the email send path fully observable end-to-end: log the enqueue (already present),
  and add previously-missing logs for job pickup, the SMTP call outcome (success with the
  provider's accepted/rejected recipients and message id, or failure with the SMTP error code
  and message — never credentials), and BullMQ's own retry/exhaustion events for the `email`
  queue. This directly targets the "email not being sent from Brevo" symptom: the point of
  failure will be visible in Loki instead of only "the user says they never got the email."
  **BREAKING**: `EmailService.Send` changes its return type to report the accepted/rejected
  recipients and provider message id instead of resolving to `void`, and `EmailJob` payloads
  gain a `correlationId` field.
- Audit and complete structured logging on the other named critical paths — auth
  (register/login/confirm/refresh/logout/OAuth, already mostly covered — this fills the gaps
  and adds the correlation ID), repair requests (create, status transitions), direct inquiries
  (sent), and offers (sent, accepted, rejected/withdrawn) — so each has an entry log, an exit
  log, and an error log — following the field-naming convention already used throughout this
  codebase (a descriptive message string carries the operation and outcome; structured fields
  carry the ids involved) rather than introducing a new one.
- Add the Loki/Grafana containers, the driver plugin install step, and Grafana provisioning
  (datasource + one starter dashboard/log-query for the email pipeline) to `DEPLOY.md`.

## Capabilities

### New Capabilities
- `observability/structured-logging`: What every log line must contain, the dev-vs-prod
  formatting split, and what counts as a "critical path" that must be logged end-to-end
  (auth, repair requests, direct inquiries, offers, email delivery).
- `observability/request-correlation`: Correlation ID generation, propagation across the HTTP
  request lifecycle and across the BullMQ email queue boundary, and exposure on the HTTP
  response.
- `observability/email-delivery-logging`: The email send pipeline's required log points
  (enqueue, pickup, provider call outcome, retry/exhaustion) and the `EmailService.Send`
  contract change needed to report a real outcome instead of `void`.

### Modified Capabilities
None — no `openspec/specs/` capabilities exist yet in this repo.

## Impact

- **Code**: `src/shared/logger/pino.options.ts`, a new correlation-id middleware/interceptor
  under `src/common/`, `src/modules/infra/email/*` (`email.types.ts`, `email-queue.service.ts`,
  `email.processor.ts`, `smtp-email.service.ts`, `email.service.interface.ts`), and logging
  additions in `src/modules/auth/auth.service.ts`,
  `src/modules/repair-requests/repair-requests.service.ts`,
  `src/modules/direct-inquiries/direct-inquiries.service.ts`,
  `src/modules/offers/offers.service.ts`.
- **Infra**: `docker-compose.yml` (new `loki` and `grafana` services + volumes, `logging:`
  driver config on `api`), a new `grafana/provisioning/` directory for the Loki datasource,
  `DEPLOY.md` (host-level Loki Docker driver plugin install step).
- **Dependencies**: one new npm package, `nestjs-cls`, to carry the correlation ID across the
  BullMQ email queue boundary without cascading `REQUEST` scope onto every service that enqueues
  an email (see design.md); `nestjs-pino`/`pino`/`pino-http` are already installed and cover
  everything else. The Loki Docker driver is a host-level Docker plugin, not an npm/app
  dependency.
- **Breaking change**: `EmailService.Send`'s return type and the `EmailJob` payload shape both
  change — every call site and test double for `EmailService`/`EmailJob` needs updating.
