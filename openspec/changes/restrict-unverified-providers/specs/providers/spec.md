## Purpose

Governs which providers are visible through the public provider directory, so customers only
discover businesses Popravime has verified.

## ADDED Requirements

### Requirement: Public directory shows only verified providers
The public provider directory SHALL return only providers whose verification status is
`verified`, regardless of any verification-status value supplied by the caller.

#### Scenario: Listing without a verification filter
- **WHEN** an unauthenticated caller lists providers with no verification filter
- **THEN** the results include only `verified` providers and exclude any `pending` or
  `rejected` provider

#### Scenario: Listing with an explicit non-verified filter
- **WHEN** a caller lists providers and requests `pending` or `rejected` providers via a
  verification-status filter
- **THEN** the results still include only `verified` providers; the requested filter value has
  no effect on which non-verified providers are returned

#### Scenario: Verified providers are unaffected
- **WHEN** a caller lists providers with no filter, or explicitly filters for `verified`
  providers
- **THEN** all matching `verified` providers are returned exactly as before, subject to the
  other existing filters (city, category, search)

### Requirement: Direct provider lookup is unaffected by verification status
Fetching a single provider by ID or by slug SHALL continue to return the provider regardless of
its verification status; only the directory listing is restricted.

#### Scenario: Fetching a pending provider by ID
- **WHEN** a caller requests a specific provider by ID whose verification status is `pending`
- **THEN** the provider's profile is returned, unaffected by this change

#### Scenario: Fetching a rejected provider by slug
- **WHEN** a caller requests a specific provider by slug whose verification status is `rejected`
- **THEN** the provider's profile is returned, unaffected by this change
