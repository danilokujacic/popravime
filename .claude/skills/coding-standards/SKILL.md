---
name: coding-standards
description: Coding standards, architecture, and workflow rules for this NestJS backend (popravime). Load before designing, planning, or implementing any module, endpoint, service, entity, DTO, guard, worker, or infra/docker change in this repo, and before writing any tests.
---

# Popravime — Backend Coding Standards

These rules are binding for every feature in this repo. When a system requirement conflicts
with a rule here, or a decision below says "ASK", stop and ask the user before proceeding —
do not silently pick a default.

## 0. Golden rule

Before building anything custom, check whether the Nest ecosystem already covers it
(`@nestjs/*` first-party packages, then well-known Nest-idiomatic libraries). Only reach for a
custom implementation when Nest genuinely has no answer.

## 1. Module structure

- Modular structure following Nest conventions: one feature = one module under
  `src/modules/<feature>/` (or `src/<feature>/` if the project stays flat — match whatever the
  first real feature establishes, then be consistent).
- Inside a feature module, separate by role: `*.controller.ts`, `*.service.ts`,
  `*.module.ts`, `*.repository.ts` (if a custom repository is needed on top of TypeORM),
  `dto/`, `entities/`, `interfaces/`, `*.types.ts`.
- Cross-cutting concerns (auth, logging, config, cache, rate-limit, health, filters,
  interceptors, pipes) live in `src/common/` or `src/core/` — pick one, stay consistent.
- Shared/reusable domain-agnostic code goes in `src/shared/`.

## 2. Services & interfaces

- Every service is defined behind an interface (`UserService implements IUserService`, file
  `user.service.ts` + `user.service.interface.ts` or a `*.interface.ts` alongside it).
- Inject services by interface/token where the concrete implementation could plausibly be
  swapped (see §12 Factories/polymorphism); inject concretely otherwise, but the interface
  must still exist so tests can mock it cleanly.

## 3. Layered architecture & error propagation

Three strict layers, one-directional knowledge:

- **Presentation** (controllers, DTOs, guards, interceptors, filters at the HTTP edge) — knows
  nothing about persistence details (no TypeORM types, no SQL errors).
- **Service/domain** (business logic) — knows nothing about persistence internals (no
  `QueryFailedError`, no ORM-specific exceptions) and nothing about HTTP (no `HttpException`
  thrown from here directly — throw domain exceptions instead).
- **Persistence** (repositories/TypeORM) — translates DB-level failures into domain
  exceptions before they leave this layer.

Rule of thumb: an error crossing a layer boundary must already be in the vocabulary of the
layer it's entering. Persistence errors get translated to domain exceptions at the persistence
boundary; domain exceptions get translated to HTTP exceptions at the presentation boundary
(centrally — see §4), never ad hoc in a controller.

## 4. Centralized error handling

- One (or a small, deliberate set of) global exception filter(s) implementing `ExceptionFilter`
  registered via `APP_FILTER`. No per-controller try/catch-and-format.
- Define a domain exception hierarchy (e.g. `DomainException` base, `NotFoundException`,
  `ConflictException`, `ValidationException` — domain-level, not `@nestjs/common`'s HTTP ones)
  that the global filter maps to HTTP status + a consistent error response shape.
- Persistence layer never lets a raw TypeORM/driver error escape — it catches and rethrows as
  a domain exception.

## 5. Infrastructure choices (fixed, do not re-litigate)

- Reverse proxy: **nginx** (never Caddy).
- **Redis**: rate limiting, caching, pub/sub when needed — one Redis, multiple logical
  concerns (separate DB index / key prefix per concern if needed).
- **BullMQ** for async/background workers (`@nestjs/bullmq`).
- **Rate limiting** applied at the route level (guard/decorator per route or route group), backed
  by Redis, not in-memory.
- **Health endpoint** via `@nestjs/terminus` — check DB, Redis, and any other critical
  dependency, not just "app is up".
- Config via `@nestjs/config`, values sourced from `.env`, with startup validation (Joi or
  class-validator schema) so the app fails fast on missing/invalid env vars.

## 6. Logging

- `nestjs-pino` everywhere. In development, use the pretty transport for readable console
  output. In production, emit structured JSON (no prettifier) so it can be shipped to
  **Loki** and visualized in **Grafana** — do not hand-roll a different logger.
- Log at every crucial branch/flow: entry/exit of significant service operations, all error
  paths, all external calls (DB, Redis, HTTP, queue), auth events, rate-limit rejections.
  Every `if/else` branch that represents a meaningfully different outcome should be
  observable in logs.
- Log payloads should carry enough context to debug without reproducing (ids, operation name,
  outcome, timing where relevant) — but see §16, never secrets or sensitive data.

## 7. Testing

- **Unit tests** for every feature, scoped to business-critical logic only — no chase for
  coverage numbers, no tests of framework plumbing.
- **2–3 integration tests** using `@testcontainers` (Postgres and/or Redis as needed) that
  exercise a real connection — not the full suite, just enough to prove the integration
  boundary works.
- After finishing a change: run unit tests and `tsc` (type-check). Never run `build` or other
  slow processes as a matter of routine.

## 8. Persistence (TypeORM + Postgres)

- Normalized schema by default. If a field looks like a good denormalization candidate for
  read performance, **ASK the user first** — do not denormalize unilaterally.
- Indexes follow actual query patterns — add them where filtering/sorting/joining actually
  happens, not speculatively.
- Cache only data that is frequently read (via Redis, §5) — not everything.
- Entities are the source of truth for what's required/nullable; DTOs and validation must
  match the entity's constraints (see §10).

## 9. Naming & style

- No comments. Names must carry the meaning.
- File names: `dash-case.ts`, with the correct suffix for what the file is
  (`.service.ts`, `.controller.ts`, `.module.ts`, `.dto.ts`, `.entity.ts`, `.interface.ts`,
  `.types.ts`, `.guard.ts`, `.strategy.ts`, `.filter.ts`, `.interceptor.ts`, `.spec.ts`, …).
- Classes, methods, types, interfaces: `PascalCase`/`ThisCase`.
- Method names: aim for ≤2 words, narrowly describing the one action taken (not a hard limit,
  but a target — if you need a third word, make sure the method still does one thing).
- Every function/method has a typed input and typed output. Never `any`, never `never` as an
  escape hatch, never `as unknown as X` / forced casts. If you hit a case where the type
  genuinely doesn't work out, **ASK the user** how to model it instead of casting around it.
- One function/method does not exceed 3 branches (if/else/switch-case arms, etc.) — extract
  helpers when a function grows past that.
- Calculators, transformers, mappers, etc. are their own classes/files, never inlined into a
  service method.

## 10. DTOs, validation, transformation

- `ValidationPipe` (global, `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`)
  + `class-validator` + `class-transformer` on every inbound DTO — no unvalidated data ever
  reaches the service/persistence layer.
- Wire format (request/response bodies) is `snake_case`; inside classes/code it's `camelCase`.
  Map at the boundary (e.g. `@Expose({ name: '...' })` / a naming strategy / an
  interceptor), not by hand in business logic.
- DTO required/nullable/optional fields mirror the underlying entity's real constraints —
  derive the DTO from the model, don't guess.

## 11. Auth

- JWT access token + refresh token flow (`@nestjs/jwt` + `@nestjs/passport`, separate
  access/refresh strategies).
- `JWT_SECRET`, `REFRESH_SECRET`, and all related config live in `.env`, loaded through
  `@nestjs/config` — never hardcoded, never logged (§16).

## 12. Polymorphism & factories

- Where something can legitimately have multiple implementations or be swapped at runtime,
  model it with an interface + factory (provider factory / factory class), not a hardcoded
  concrete dependency or an if/else on type.

## 13. Constants & configuration

- Constants are provided via DI tokens (`InjectionToken` + `Provider`), not scattered magic
  literals.
- Every time a new constant is introduced, **ASK the user** whether it belongs in
  configuration (`.env` / config module) instead of being a fixed constant.

## 14. REST API design

- No verbs in URLs — resource nouns and proper relationship nesting
  (`/users/:id/orders`, not `/getUserOrders`).
- Correct HTTP verbs for the action (GET/POST/PATCH/PUT/DELETE used per their semantics).
- List (`GET` collection) endpoints expose query params for filtering, and those params
  should cover the filterable properties of the entity being listed.

## 15. Docker Compose

- Compose file includes all services (api, worker, nginx, redis, postgres, …).
- Postgres is only present via the compose image for **local development** — production uses
  a managed/cloud database, not the containerized one.
- Services declare proper `depends_on` relationships; split into separate networks where it
  makes sense (e.g. public-facing edge network vs internal data network).

## 16. Security

- No secrets or sensitive data in logs, error responses, code, or version control — ever.
  This includes tokens, passwords, PII in log payloads, connection strings, etc.

## When requirements arrive

For each feature in the upcoming system requirements: place it in the right module (§1),
define the service behind an interface (§2), respect layer boundaries and centralized error
handling (§3–4), validate/transform DTOs at the edge (§10), add logging on every branch (§6),
write the targeted unit tests (§7), and flag any constant/config or denormalization decision
back to the user (§8, §13) instead of deciding unilaterally.
