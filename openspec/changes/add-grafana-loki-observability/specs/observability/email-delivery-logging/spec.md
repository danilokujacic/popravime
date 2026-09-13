## Purpose

Defines the log points and outcome data the email delivery pipeline must produce so a delivery
failure with the transactional email provider can be diagnosed from logs alone, without asking
the affected user to reproduce it.

## ADDED Requirements

### Requirement: Email enqueue is logged
The system SHALL log when an email is queued for delivery, recording the kind of email, the
recipient, and the correlation ID it was queued under.

#### Scenario: Email queued
- **WHEN** any part of the system queues an email for delivery
- **THEN** a log line records the email kind, the recipient, and the correlation ID

### Requirement: Email job pickup is logged
The system SHALL log when a queued email job is picked up for processing, recording the kind of
email, the recipient, and which attempt this is.

#### Scenario: Worker begins processing a queued email
- **WHEN** the email queue worker begins processing a queued job
- **THEN** a log line records the email kind, the recipient, the attempt number, and the job's
  correlation ID

### Requirement: The email provider's outcome is fully reported
The system SHALL report the outcome of every call to the email provider — success or failure —
with enough detail to diagnose a delivery problem, and SHALL surface that outcome as the result
of sending the email rather than resolving successfully regardless of what the provider did.

#### Scenario: Provider accepts the email
- **WHEN** the email provider accepts an email for delivery
- **THEN** a log line records success, the provider-assigned message identifier, and which
  recipients were accepted
- **AND** sending the email reports that accepted outcome to its caller

#### Scenario: Provider rejects or errors on the email
- **WHEN** the email provider rejects the email or the send attempt errors (for example, an
  authentication failure with the provider, or a rejected recipient)
- **THEN** a log line at a severity indicating failure records the provider's error code and
  message and which recipients were rejected, with no provider credentials included
- **AND** sending the email reports that failure to its caller instead of resolving as if it
  succeeded

### Requirement: Retry and exhaustion are visible
The system SHALL log each retry of a failed email job and SHALL log at a severity indicating
failure when an email job exhausts all of its retry attempts without succeeding.

#### Scenario: Email job is retried
- **WHEN** an email job fails and is retried
- **THEN** a log line records the attempt number and the reason the previous attempt failed

#### Scenario: Email job exhausts all retries
- **WHEN** an email job fails on its final allowed attempt
- **THEN** a log line at a severity indicating failure records that the job will not be retried
  again, the email kind, the recipient, and the last failure reason

### Requirement: Email logs never contain secrets or full message content
The system SHALL exclude SMTP/provider credentials and the full rendered email body from every
log line in the email delivery pipeline.

#### Scenario: Logging any point in the email pipeline
- **WHEN** the system logs the enqueue, pickup, provider outcome, retry, or exhaustion of an
  email job
- **THEN** the log line contains no SMTP/provider credentials and no full rendered email HTML
  body
