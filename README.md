# Popravime

Backend API for Popravime — a repair-marketplace platform connecting people who need
electronics/appliance repairs with verified service providers in Montenegro.

This repository covers **Phase 1, 2, and 3** of the build: auth, users, cities, categories,
providers, repair requests, and offers (Phase 1); reviews, direct inquiries, messages,
notifications, and provider verification (Phase 2); CMS (blog posts, FAQ, price estimates),
contact messages, audit logs, and admin analytics (Phase 3) — plus all cross-cutting
infrastructure (config, logging, centralized error handling, validation, Redis
caching/rate-limiting/queues, storage, email). **Phases 4–6** followed up with hardening, not
new features: real DB transactions around every multi-write orchestration
(`typeorm-transactional`), repair-request view scoping, deep `working_hours` validation, a
correct provider-gallery storage-key fix, a dedicated contact-message rate limit, and audit-log
coverage for every remaining admin mutation. See `PROGRESS.md` for exact status (including the
Phase 4–6 write-up) and `.claude/plans/compressed-twirling-hummingbird.md` for the full plan.
Coding standards live in `.claude/skills/coding-standards/SKILL.md`.

## Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL (TypeORM, migration-only schema — no `synchronize`)
- **Cache / rate limiting / queues**: Redis (`@nestjs/cache-manager` + Keyv, `@nestjs/throttler`,
  BullMQ)
- **Object storage**: S3-compatible (MinIO locally, Cloudflare R2 in production)
- **Email**: SMTP (Maildev locally, a real relay in production), sent asynchronously via BullMQ
- **Auth**: JWT access + refresh tokens
- **Logging**: `nestjs-pino` (pretty-printed in dev, structured JSON in production for
  Loki/Grafana)
- **Geocoding**: OpenStreetMap Nominatim

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in real values
docker compose up -d postgres redis minio maildev   # local infra
pnpm run migration:run
pnpm run seed:run
pnpm run start:dev
```

The API listens on `PORT` (default `3000`); Swagger docs are served at `/docs`.

`docker-compose.yml` is **local development infra only** (Postgres, Redis, MinIO, Maildev) — the
API itself runs on the host via `pnpm start:dev` above, not in a container, during normal
development. Production uses a separate file, `docker-compose.prod.yml` (the API built from this
repo's own `Dockerfile`, Redis, Loki, Grafana — no Postgres/MinIO/Maildev, production points at
managed Neon/R2/a real SMTP relay instead). nginx is **not** in that file — production reverse-
proxies through nginx installed directly on the host, see `nginx/nginx.conf` and `DEPLOY.md`.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm run start:dev` | Run the API with hot reload |
| `pnpm run test` | Unit tests |
| `pnpm run test:integration` | `@testcontainers`-backed integration tests (requires Docker) |
| `pnpm run migration:run` / `migration:revert` / `migration:generate` | TypeORM migrations |
| `pnpm run seed:run` | Seed Montenegro cities + device categories |
| `pnpm run lint` | ESLint |

## Modules

**Phase 1**: `auth`, `users`, `cities`, `categories`, `providers`, `repair-requests`, `offers`.

**Phase 2**: `notifications` (single choke point for in-app + email dispatch), `reviews`
(provider rating recomputed on every new review), `direct-inquiries`, `messages` (per-request or
per-inquiry conversations), `verification-requests` (provider certification workflow, admin
approve/reject).

**Phase 3**: `blog-posts`, `faq-items`, `price-estimates` (public CMS content, cached),
`contact-messages` (public submit, admin queue), `audit-logs` (write-only, wired into
verification-request decisions), `admin` (`GET /admin/analytics` — provider verification
breakdown, repair-request status breakdown, overall review stats, top cities by provider count).

Every module in every phase follows the same shape — see `.claude/skills/coding-standards/SKILL.md`.

Bootstrap admin: `pnpm run seed:run` creates one admin user (`ADMIN_EMAIL`/`ADMIN_PASSWORD`,
both required env vars), idempotently — safe to re-run.
