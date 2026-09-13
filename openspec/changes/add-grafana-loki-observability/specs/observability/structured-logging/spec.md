## Purpose

Defines what every emitted log line must contain, how its format must differ between local
development and every other environment, and which business flows must be observable
end-to-end (entry, successful outcome, and failure) purely from the logs.

## ADDED Requirements

### Requirement: Environment-appropriate log formatting
The system SHALL render logs as human-readable, single-line console output in the development
environment, and as structured JSON (no pretty-printing) in every other environment, so
production logs are machine-parseable by a log aggregator while local development stays
readable.

#### Scenario: Running in development
- **WHEN** the application starts with the environment set to development
- **THEN** every log line is printed to the console in a human-readable, single-line format

#### Scenario: Running outside development
- **WHEN** the application starts with the environment set to anything other than development
- **THEN** every log line is emitted as a single structured JSON object with no pretty-printing

### Requirement: No sensitive data in any log line
The system SHALL exclude secrets and credentials (passwords, password hashes, access/refresh
tokens, SMTP/API credentials) from every log line, regardless of where that value appears in
the data being logged (request body, response body, an object passed to the logger).

#### Scenario: Sensitive field present in logged data
- **WHEN** a value being logged contains a field named or aliased as a password, password hash,
  access token, refresh token, or credential/secret
- **THEN** the emitted log line replaces that field's value with a redaction marker instead of
  the real value

### Requirement: Critical business flows are logged end-to-end
The system SHALL emit, for each critical business flow, a log line when the flow starts, a log
line recording its successful outcome, and a log line recording its failure and reason when it
fails — so the full lifecycle of that flow is reconstructable from logs alone. Critical business
flows are: user registration, login, email confirmation, logout, OAuth login/signup, repair
request creation and status transitions, direct inquiry submission, offer submission,
acceptance, and rejection/withdrawal, and email delivery attempts.

#### Scenario: Successful critical operation
- **WHEN** a critical business flow (for example, a repair request is created, an offer is
  accepted, or a user logs in) completes successfully
- **THEN** a log line records the operation, the entities/ids involved, and that it succeeded

#### Scenario: Failed critical operation
- **WHEN** a critical business flow fails for any reason (validation rejection, a downstream
  dependency error, an unexpected exception)
- **THEN** a log line at a severity indicating failure records the operation, the entities/ids
  involved so far, and the reason for the failure

#### Scenario: Rejected or unauthorized attempt on a critical operation
- **WHEN** a critical business flow is attempted but rejected before completing for a
  business/authorization reason (for example, login with invalid credentials, or accepting an
  offer that does not belong to the caller)
- **THEN** a log line records the attempt, the reason it was rejected, and enough identifying
  context to investigate the attempt without exposing credentials
