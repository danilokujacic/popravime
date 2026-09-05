## Purpose

Defines the behavior the backend and its deployment configuration must guarantee to run safely
in production on the target stack (Hetzner VM, Neon Postgres, Cloudflare R2, local Redis, nginx)
without breaking existing API behavior.

## ADDED Requirements

### Requirement: Encrypted database connectivity
The system SHALL establish its Postgres connection over TLS whenever the configured database
host is not a loopback/private development host, and SHALL make TLS explicitly configurable via
environment variable rather than hardcoded.

#### Scenario: Connecting to a managed Postgres provider
- **WHEN** the application starts with `DATABASE_SSL=true` (or equivalent) pointing at a managed
  Postgres host such as Neon
- **THEN** the TypeORM connection negotiates TLS and the application starts successfully

#### Scenario: Local development without TLS
- **WHEN** the application starts against the local Docker Compose Postgres container with
  `DATABASE_SSL` unset or `false`
- **THEN** the TypeORM connection is made without TLS and the application starts successfully,
  matching current local development behavior

### Requirement: Production CORS allow-list
The system SHALL reject cross-origin requests from origins outside an explicit allow-list when
`NODE_ENV=production`, and SHALL NOT fall back to "allow any origin" in that environment.

#### Scenario: Configured production origin
- **WHEN** `NODE_ENV=production` and `CORS_ORIGIN` is set to one or more concrete origins
- **THEN** requests from an origin in that list succeed and requests from any other origin are
  rejected by CORS

#### Scenario: Missing production origin configuration
- **WHEN** `NODE_ENV=production` and `CORS_ORIGIN` is empty or `*`
- **THEN** the application fails fast at startup with a clear configuration error instead of
  silently allowing all origins

### Requirement: TLS termination at the edge
The system's reverse proxy configuration SHALL terminate HTTPS for public traffic and redirect
plain HTTP requests to HTTPS.

#### Scenario: Plain HTTP request to the public host
- **WHEN** a client makes an HTTP (port 80) request to the production domain
- **THEN** nginx issues a redirect to the HTTPS equivalent URL

#### Scenario: HTTPS request to the public host
- **WHEN** a client makes an HTTPS (port 443) request to the production domain
- **THEN** nginx terminates TLS using a valid certificate for that domain and proxies the
  request to the API upstream

### Requirement: Deployable container topology
The system's Docker Compose configuration SHALL define runnable `api` and `nginx` services (not
commented out) wired to the same network, environment, and health checks as the rest of the
stack, so the stack can be brought up with a single command on the target host.

#### Scenario: Bringing up the full local/prod-shaped stack
- **WHEN** an operator runs the Compose stack with a valid `.env` file
- **THEN** the `api` service builds from the repo `Dockerfile`, starts after its dependencies
  report healthy, and becomes reachable through the `nginx` service

### Requirement: Safe object storage keys
The system SHALL derive object storage keys for uploaded files without embedding
unsanitized, attacker-controlled file names, so that unusual characters in a client-supplied
file name cannot produce an unexpected or colliding storage key.

#### Scenario: Upload with an unusual file name
- **WHEN** a client uploads a file whose original name contains path separators, control
  characters, or is unusually long
- **THEN** the object is stored under a key derived safely from a generated identifier, and any
  human-readable portion of the original name is sanitized/truncated before being included

### Requirement: Health-check-gated rollout
The system SHALL expose a health endpoint that reports the database and cache as reachable
before a deployment is considered successful, and deployment tooling SHALL treat a failing
health check as a failed rollout.

#### Scenario: Successful deploy
- **WHEN** a new API version is deployed and `GET /health` returns an overall "up" status with
  both the `database` and `redis` indicators up
- **THEN** the rollout is considered successful and old containers are retired

#### Scenario: Failed dependency after deploy
- **WHEN** a new API version is deployed but `GET /health` reports the `database` or `redis`
  indicator as down
- **THEN** the rollout is treated as failed and the deployment procedure keeps or restores the
  previous known-good version instead of leaving the failing version serving traffic
