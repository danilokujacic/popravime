# Popravime

Backend API for Popravime — a repair-marketplace platform connecting people who need
electronics/appliance repairs with verified service providers in Montenegro.

This repository is **Phase 1** of the build: auth, users, cities, categories, providers,
repair requests, and offers, plus all cross-cutting infrastructure (config, logging,
centralized error handling, validation, Redis caching/rate-limiting/queues, storage, email).
See `PROGRESS.md` for exact status and `.claude/plans/compressed-twirling-hummingbird.md` for
the full Phase 1 plan. Coding standards live in `.claude/skills/coding-standards/SKILL.md`.

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

To run the full stack (including the API itself and nginx) in containers:

```bash
docker compose up --build
```

`postgres` in `docker-compose.yml` is **local development only** — production points at a
managed cloud Postgres instance, not this container.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm run start:dev` | Run the API with hot reload |
| `pnpm run test` | Unit tests |
| `pnpm run test:integration` | `@testcontainers`-backed integration tests (requires Docker) |
| `pnpm run migration:run` / `migration:revert` / `migration:generate` | TypeORM migrations |
| `pnpm run seed:run` | Seed Montenegro cities + device categories |
| `pnpm run lint` | ESLint |

## Roadmap

**Phase 2** (not yet built): `reviews`, `direct_inquiries`, `messages`, `notifications`,
`verification_requests` (provider certification workflow).

**Phase 3** (not yet built): CMS (`blog_posts`, `faq_items`, `price_estimates`),
`contact_messages`, `audit_logs`, admin analytics.
