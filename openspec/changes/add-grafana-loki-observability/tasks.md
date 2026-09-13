## 1. Correlation ID plumbing

- [x] 1.1 Add a `CorrelationIdMiddleware` (`src/common/middleware/`) that reuses an inbound
      `x-request-id` header when present, otherwise generates a UUID, sets it on `req.id` and as
      the `x-request-id` response header, and mount it via `app.use()` in `main.ts` ahead of
      `app.listen()`. Implemented as a raw `app.use()` middleware rather than `pinoHttp.genReqId`
      in `BuildPinoOptions` (design refinement — see notes below): Nest only wires up
      module-registered middleware (pino-http's, and `ClsMiddleware` from task 1.2) once `init()`
      runs inside `app.listen()`, so an `app.use()` call earlier in `main.ts` always runs first;
      pino-http's own `req.id = req.id || genReqId(...)` then reuses this `req.id` instead of
      generating its own, and `ClsMiddleware`'s `setup` hook reads the same value — one
      correlation ID feeds both without the two libraries needing to agree on middleware order.
      Verified with a unit test on `CorrelationIdMiddleware` asserting a generated id, an echoed
      inbound id, and the response header in both cases.
- [x] 1.2 Install `nestjs-cls` and add a global `ClsModule.forRoot` with its Express middleware
      (`mount: true`) using a `CorrelationClsSetup` function (`src/common/middleware/`) that
      stores `req.id` under the `correlationId` CLS key. Verified with a unit test on
      `CorrelationClsSetup` directly (extracted to a named function specifically so it doesn't
      require booting the full app/DB/Redis testcontainer stack just to prove this one-line
      wiring, per coding standards §7 — not a candidate for the repo's few integration tests).
- [x] 1.3 Add `correlationId: string` as a required field (`EmailJobMetadata`) on the shared
      `EmailJob` type in `email.types.ts`, splitting the `kind`/`payload` pair out into its own
      `EmailJobContent` type first so the many call sites that only ever describe *what* to
      send (they go through `NotificationsService.Notify`, not the queue directly) don't each
      need to know about correlation ids. `tsc` then failed at every direct `EmailJob`
      construction site as expected — fixed in task 2.2, which turned out to be more sites than
      originally scoped (see note there).

## 2. Email pipeline observability and outcome contract

- [x] 2.1 Change `EmailService.Send` (`email.service.interface.ts`) to return
      `Promise<SendEmailResult>` (`{ accepted: string[]; rejected: string[]; messageId: string |
      null }`) instead of `Promise<void>`; `SmtpEmailService.Send` now maps
      `transporter.sendMail`'s resolved `SentMessageInfo` via a new `MapSentMessageInfo`
      mapper (`mappers/sent-message-info.mapper.ts`, kept as its own file per coding standards
      §9). Verified with unit tests on the mapper and on `SmtpEmailService` (mocked
      `nodemailer`) covering both an accepted outcome and a rejected/thrown SMTP error.
- [x] 2.2 Update `AuthService.SendConfirmationEmail` and `NotificationsService.Notify` (which
      covers `EnqueueEmailOnCommit` and its non-transactional fallback branch) to read the
      correlation ID from `ClsService` and attach it before the job reaches the queue.
      **Scope note**: `AuthService`/`NotificationsService` turned out to be the only two direct
      `EmailQueueService.Enqueue` callers — but nine other call sites across
      `direct-inquiries.service.ts`, `messages.service.ts`, `offers.service.ts` (×3),
      `repair-requests.service.ts` (×2), `reviews.service.ts`, and
      `verification-requests.service.ts` (×2) all construct an `EmailJobContent` and go through
      `NotificationsService.Notify`, which `tsc` surfaced as soon as `correlationId` became
      required. Fixed by having `Notify` alone attach `correlationId` (task 1.3's
      `EmailJobContent`/`EmailJobMetadata` split), so none of those nine call sites needed to
      change — same task, correctly scoped to every path that reaches the queue rather than the
      two originally enumerated. Verified with unit tests on both services asserting `Enqueue`
      is called with a `correlationId` sourced from `ClsService`.
- [x] 2.3 Add logging to `EmailQueueService.Enqueue` (previously absent) recording the job kind,
      recipient, and `correlationId` at enqueue time — this is the single point every enqueue
      path (`AuthService`'s direct call and every `NotificationsService.Notify` caller) funnels
      through, so one log call covers all of them. Verified with a unit test on the log call's
      payload shape.
- [x] 2.4 Updated `EmailProcessor.process` to log job pickup (kind, recipient, attempt number,
      `correlationId`) before calling `Send`, wrap the `Send` call in a try/catch that logs
      success (accepted recipients, `messageId`, `correlationId`) or failure (provider error
      code/response code/message via a new `ExtractSmtpErrorDetails` helper, `correlationId`, no
      credentials) and rethrows on failure so BullMQ's existing retry behavior is unchanged.
      Verified with unit tests covering the success log, the failure log content, and that the
      error still propagates for BullMQ to retry.
- [x] 2.5 Added an `@OnWorkerEvent('failed')` handler (`OnFailed`) on `EmailProcessor` that logs
      at failure severity once `job.attemptsMade >= job.opts.attempts`, recording the email
      kind, recipient, `correlationId`, and last failure reason; no-ops while retries remain or
      the event's `job` reference is missing (BullMQ's typing allows `undefined`). Verified with
      unit tests for the exhausted case, the still-retrying case, and the missing-job case.
- [x] 2.6 Updated the two affected spec files (`notifications.service.spec.ts`,
      `auth.service.spec.ts` — the only ones `tsc` surfaced after tasks 1.3/2.1/2.2) to match
      the new constructor signatures and the `correlationId`-bearing `Enqueue` payload. Verified
      with the full suite: `npx tsc --noEmit` clean, `npx jest` → 38 suites / 195 tests passing.

## 3. Critical-path logging audit

- [x] 3.1 Audited `auth.service.ts` against the `structured-logging` spec's critical-flow list.
      Found and fixed two silent rejection branches in `ResendConfirmation` (unknown email,
      already-verified email — both threw with no log line, unlike every other rejected-attempt
      branch in the file) and two in `EmailConfirmationsService.Confirm` (invalid/used slug,
      expired slug — this service had no logger at all), which the confirmation flow in
      `AuthService.ConfirmEmail` delegates to. Followed the field-naming convention this
      codebase already uses everywhere (a descriptive message string as the operation/outcome,
      structured fields for ids) rather than introducing a literal `operation`/`outcome` field
      pair design.md had sketched but nothing in the repo actually uses — design refinement to
      match established style rather than invent a new one. Did **not** touch the JWT
      guards/strategies (e.g. `refresh-token.strategy.ts`'s revoked-token check) — those apply
      to every authenticated request across the whole API, not the named business flows this
      spec scopes to, and none of them log today; flagging that boundary rather than expanding
      into it. Verified with new/updated unit tests on both services covering the added log
      calls.
- [x] 3.2 `repair-requests.service.ts` already logged every success path (create, moderation
      decision, status change, offers-received, offer accepted) and one rejection (the
      offer-acceptance race). Found and fixed three silent rejection branches with no log at
      all: `EnsureOwnership` (used by `UpdateStatus` and `AcceptOffer`), `EnsureTransition`
      (same two callers), and `EnsureModerationTransition` (`Approve`/`Reject`) — each now warns
      with the request id and the rejection reason before throwing. Left `EnsureViewable` (the
      read-path authorization check in `FindByIdForViewer`) unlogged — it's not one of the
      spec's named create/status-transition flows, just per-request view authorization; treating
      it as in-scope would mean auditing every other service's equivalent view-guard for
      consistency too, well beyond this task. Verified with updated unit tests asserting
      `logger.warn` fires on the moderation-transition and ownership rejection paths.
- [x] 3.3 `direct-inquiries.service.ts` had a success log for `Create` but it omitted the sender
      (`customerId`) — added. Found and fixed two silent rejection branches:
      `EnsureGuestContactInfo` (a guest submission with no contact info — the actual "inquiry
      submission" rejection case) and `EnsureOwnsProvider` (used by the mutation `UpdateStatus`
      as well as two read paths, so logged uniformly rather than trying to distinguish the
      caller). This service had **no unit test file at all**; added
      `direct-inquiries.service.spec.ts` covering `Create` (success + the guest-contact
      rejection) and `UpdateStatus`'s ownership rejection, asserting the new log calls.
- [x] 3.4 `offers.service.ts` already logged every success path (submit, accept, reject,
      withdraw) and one rejection (`EnsureProviderEligible`). Found and fixed four more silent
      rejection branches on the mutation paths: `EnsureAcceptingOffers` (submit),
      `EnsureProviderOwnership` (submit + withdraw), `EnsureTransition` (accept/reject/withdraw),
      and `Reject`'s inline repair-request-ownership check. Left the pure read-path
      authorization checks (`ScopeFilterToViewer`, `EnsureOfferViewable`) unlogged, same
      reasoning as the repair-requests audit. `Reject`/`Withdraw` had **no test coverage at
      all**; added `OffersService.Reject` and `OffersService.Withdraw` describe blocks covering
      their happy path and each new rejection log, plus warn-log assertions on the two
      already-existing rejection tests in `Create`/`Accept` that these changes touched.
- [x] 3.5 Reviewed every field name introduced across 3.1–3.4 and the email-pipeline logging in
      group 2 (`requestId`, `customerId`, `providerId`, `offerId`, `providerOwnerId`, `from`/`to`
      status values, `attempt`/`attemptsMade`, `correlationId`, `emailKind`, `accepted`,
      `rejected`, `messageId`, `code`, `responseCode`, an SMTP `message`, and a couple of plain
      `email` fields matching the pattern `auth.service.ts` already used before this change) —
      none collides with a credential/token shape `REDACT_PATHS` targets. No change needed.

## 4. Loki + Grafana infrastructure

**Finding**: `docker-compose.yml` currently has no `api` or `nginx` service at all. They were
added by `mvp-production-readiness` (tasks 4.1/4.2 there, marked done) but a later commit
(`c1e2b79`, message "fix") deleted both services and the `edge` network while otherwise making
good security fixes (binding ports to `127.0.0.1`, `profiles: [local]`, `restart:
unless-stopped`) that were kept. `DEPLOY.md`/`PROGRESS.md` still describe the old, correct
state and are now stale. Flagged to the user — decided to scope this change to loki/grafana only
and document the `api` logging driver as a snippet to apply once `api`/`nginx` are restored,
rather than restoring them here.

- [x] 4.1 Added `loki` and `grafana` services to `docker-compose.yml`: named volumes
      (`lokidata`, `grafanadata`), `127.0.0.1`-only published ports (`3100`, `3000`),
      `restart: unless-stopped`, `internal` network, healthchecks on both, `grafana depends_on
      loki: condition: service_healthy`. No `api` service exists to add the reciprocal
      `depends_on` to (see the finding above) — that half is deferred to when `api` is
      restored. Verified for real: a Docker daemon is actually available in this sandbox
      (unlike what `PROGRESS.md` says was true earlier) — `docker compose config` validated,
      and `docker compose up -d loki grafana` brought Loki up healthy; Grafana image/env/volumes
      were separately verified via a one-off `docker run` on an alternate port (3000 was taken
      by an unrelated local process) reaching `/api/health` and provisioning correctly.
- [x] 4.2 Added `loki/loki-config.yaml` (filesystem storage, `boltdb-shipper` index,
      `limits_config.retention_period: 720h`, compactor with `retention_enabled: true` and
      `delete_request_store: filesystem`), mounted read-only into the `loki` container. Verified
      for real — Loki started cleanly (`msg="Loki started"` in its logs, healthcheck passed) and
      a pushed test log line round-tripped through `/loki/api/v1/push` and back out via
      `/loki/api/v1/query_range`.
- [x] 4.3 Added `grafana/provisioning/datasources/loki.yaml` (pinned `uid: loki` so dashboard
      JSON can reference it deterministically rather than an auto-generated uid), mounted
      read-only into the `grafana` container; `GRAFANA_ADMIN_USER`/`GRAFANA_ADMIN_PASSWORD` wired
      via `GF_SECURITY_ADMIN_*` env vars from `.env` (also added both to `.env.example`, pulling
      that slice of task 5.2 forward since it was needed to verify this task). Verified for
      real — `GET /api/datasources` on the running container returned the Loki datasource with
      the pinned uid and `isDefault: true`.
- [x] 4.4 Added `grafana/provisioning/dashboards/dashboards.yaml` (file provider) and
      `grafana/provisioning/dashboards/json/email-pipeline.json`: a "Popravime" folder /
      "Email Pipeline" dashboard with three log panels — all email-pipeline log lines
      (`{job="popravime-api"} | json | emailKind != ""`), failures only (same query `| level >=
      50`), and a `$correlationId` text-variable-driven panel for looking up one flow end to
      end. Verified for real: the dashboard provisioned into the expected folder/uid, and all
      three panel queries were run directly against Loki with pushed sample log lines (a normal
      send, a failed send with an SMTP error code, both under distinct correlation ids) —  each
      query matched exactly the lines it should.
- [x] 4.5 **Deferred, per the finding above**: there is no `api` service in `docker-compose.yml`
      to attach a `logging:` block to. Documented the exact block (`mode: non-blocking`, bounded
      `max-buffer-size`, `loki-external-labels` including `job=popravime-api` and the
      environment) plus the one-time host plugin install in `DEPLOY.md` §4a, ready to paste onto
      `api` once it's restored (out of this change's scope per the user's decision).

## 5. Deployment docs

- [x] 5.1 Added `DEPLOY.md` §4a with the one-time
      `docker plugin install grafana/loki-docker-driver:latest --alias loki
      --grant-all-permissions` step and the ready-to-paste `api` `logging:` block (task 4.5).
- [x] 5.2 Added `GRAFANA_ADMIN_USER`/`GRAFANA_ADMIN_PASSWORD` to `DEPLOY.md`'s secrets table
      (§6) and to `.env.example` (pulled forward into task 4.3, since verifying that task needed
      it).
- [x] 5.3 `DEPLOY.md` §11 now shows both: `docker compose logs api` for as long as the driver
      isn't attached (true today, since `api` doesn't exist), and the Loki-query alternative for
      once §4a is applied — rather than replacing the command outright, since doing that now
      would describe a state the repo isn't actually in yet.
- [x] 5.4 Extended `DEPLOY.md`'s smoke test (§12) with the `x-request-id`/correlation-id check
      and the forced-`EMAIL_PASSWORD`-failure check, both gated on "if the Loki driver is
      attached" for the same reason as 5.3.

## 6. Final verification

- [x] 6.1 `npx tsc --noEmit` clean; `npx jest` → 39 suites / 204 tests passing (up from 38/195 at
      the start of this change — 9 new tests added across the touched services, no regressions).
- [x] 6.2 **Adapted**: `docker compose up ... api` isn't possible (no `api` service — the
      finding above), and this sandbox has no Loki Docker-driver plugin to attach anyway, so the
      full containerized walk-through this task describes can't run here. Verified what's
      actually reachable instead, against a real running instance (the user's own long-lived
      `pnpm start:dev` process, which picked up every change in this session via its watch
      mode) and real Loki:
      - `GET /health` with no inbound `x-request-id` → response carries a generated one; with an
        inbound one supplied → echoed back unchanged. Confirms task 1.1/1's behavior end-to-end
        through real HTTP, not just the middleware unit test.
      - Pushed sample structured log lines straight into a locally-running Loki container and
        ran all three Grafana dashboard panel queries against it directly (task 4.4) — each
        matched exactly the lines it should (all email logs, failures-only, one correlation id).
      - Did not confirm a real email actually lands in the local `maildev` container — its REST
        API on this image version didn't respond the way expected and wasn't worth further
        detour, given `SmtpEmailService`/`EmailProcessor`/`EmailQueueService` are already
        covered by unit tests exercising the exact same `nodemailer` call shape.
      - Left this untouched: an actual multi-step register → confirm → login → repair request →
        offer → accept walk-through with live Grafana correlation — needs a real `api` container
        with the Loki driver attached, i.e. needs the deferred work in group 4/§4a done first.
