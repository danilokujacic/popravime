## Purpose

Defines how a single correlation identifier is assigned to an inbound request and every piece
of work it triggers, including work that continues asynchronously after the response has
already been sent, so all the log lines belonging to one end-to-end flow can be found together.

## ADDED Requirements

### Requirement: Every request is assigned a correlation ID
The system SHALL assign a correlation ID to every inbound HTTP request and include it in every
log line produced while handling that request, so all logs for one request can be found by that
one value.

#### Scenario: Request without a correlation ID supplied
- **WHEN** an inbound request does not carry a correlation ID
- **THEN** the system generates a new correlation ID and includes it in every log line produced
  while handling that request

#### Scenario: Request with a correlation ID supplied
- **WHEN** an inbound request carries a caller-supplied correlation ID
- **THEN** the system reuses that value as the correlation ID instead of generating a new one,
  and includes it in every log line produced while handling that request

### Requirement: Correlation ID is returned to the caller
The system SHALL return the correlation ID used for a request back to the caller, so a client or
support ticket can reference it when reporting an issue.

#### Scenario: Request completes
- **WHEN** the system finishes handling a request, whether it succeeded or failed
- **THEN** the response includes the correlation ID used for that request

### Requirement: Correlation ID survives the email queue boundary
The system SHALL carry the correlation ID of the request that triggered an email across the
asynchronous email queue, so the log lines for enqueuing an email and later sending it share the
same correlation ID even though sending happens after the original response was already
returned.

#### Scenario: Request enqueues an email
- **WHEN** handling a request causes an email to be queued for delivery
- **THEN** the request's correlation ID is attached to the queued email job and appears in every
  log line produced while that job is later processed and sent

#### Scenario: Email queued outside of a request
- **WHEN** an email is queued by a process that is not itself handling an inbound request
- **THEN** the system assigns that email job a correlation ID of its own so its processing logs
  are still traceable as one unit
