## Purpose

Governs which providers are visible through the public provider directory, so customers only
discover businesses that are eligible to be shown — verified businesses always, and pending
businesses during a configurable onboarding period before verification enforcement is switched
on.

## ADDED Requirements

### Requirement: Public directory visibility is verification-status-aware
The public provider directory SHALL return only providers whose verification status is eligible,
regardless of any verification-status value supplied by the caller. A provider is eligible when
its verification status is `verified`, or when its verification status is `pending` and the
verification-required setting is disabled. A provider whose verification status is `rejected` is
never eligible, regardless of the verification-required setting.

#### Scenario: Listing with verification required (default)
- **WHEN** an unauthenticated caller lists providers with the verification-required setting
  enabled
- **THEN** the results include only `verified` providers and exclude any `pending` or `rejected`
  provider

#### Scenario: Listing with verification not required
- **WHEN** an unauthenticated caller lists providers with the verification-required setting
  disabled
- **THEN** the results include `verified` and `pending` providers, and exclude any `rejected`
  provider

#### Scenario: Rejected providers are always excluded
- **WHEN** a caller lists providers, whether the verification-required setting is enabled or
  disabled
- **THEN** the results never include a `rejected` provider

#### Scenario: Listing with an explicit non-verified filter
- **WHEN** a caller lists providers and requests `pending` or `rejected` providers via a
  verification-status filter
- **THEN** the results are unaffected by that filter value — the same eligibility rule applies as
  if no filter had been supplied

#### Scenario: Verified providers are unaffected
- **WHEN** a caller lists providers with no filter, or explicitly filters for `verified`
  providers, under either setting of verification-required
- **THEN** all matching `verified` providers are returned exactly as before, subject to the other
  existing filters (city, category, search)

### Requirement: Direct provider lookup is unaffected by verification status
Fetching a single provider by ID or by slug SHALL continue to return the provider regardless of
its verification status and regardless of the verification-required setting; only the directory
listing is restricted.

#### Scenario: Fetching a pending provider by ID
- **WHEN** a caller requests a specific provider by ID whose verification status is `pending`
- **THEN** the provider's profile is returned, unaffected by this requirement

#### Scenario: Fetching a rejected provider by slug
- **WHEN** a caller requests a specific provider by slug whose verification status is `rejected`
- **THEN** the provider's profile is returned, unaffected by this requirement
