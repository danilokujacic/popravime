## Purpose

Governs which providers may see and act on customer repair requests, so only businesses eligible
under the current verification-required setting — verified businesses always, and pending
businesses during a configurable onboarding period — can respond to customers.

## ADDED Requirements

### Requirement: Repair-request visibility for a provider owner is verification-status-aware
A provider owner SHALL only be able to list or view repair requests through a provider that is
eligible: `verified`, or `pending` when the verification-required setting is disabled. An owner
whose only provider is `rejected` is always treated as having no serviced categories for
repair-request visibility purposes, regardless of the verification-required setting. An owner
whose only provider is `pending`, while the verification-required setting is enabled, is likewise
treated as having no serviced categories.

#### Scenario: Listing as the owner of a pending provider, verification required
- **WHEN** the owner of a `pending` provider lists repair requests while the verification-required
  setting is enabled
- **THEN** the result is empty, even if an approved repair request exists in a category that
  provider services

#### Scenario: Listing as the owner of a pending provider, verification not required
- **WHEN** the owner of a `pending` provider lists repair requests while the verification-required
  setting is disabled
- **THEN** approved repair requests in that provider's serviced categories are returned

#### Scenario: Listing as the owner of a rejected provider
- **WHEN** the owner of a `rejected` provider lists repair requests, whether the
  verification-required setting is enabled or disabled
- **THEN** the result is empty, even if an approved repair request exists in a category that
  provider services

#### Scenario: Viewing a specific repair request as the owner of a pending provider, verification required
- **WHEN** the owner of a `pending` provider requests a specific approved repair request by ID in
  a category that provider services, while the verification-required setting is enabled
- **THEN** the request is denied

#### Scenario: Viewing a specific repair request as the owner of a pending provider, verification not required
- **WHEN** the owner of a `pending` provider requests a specific approved repair request by ID in
  a category that provider services, while the verification-required setting is disabled
- **THEN** the request is allowed

#### Scenario: Listing as the owner of a verified provider
- **WHEN** the owner of a `verified` provider lists repair requests, whether the
  verification-required setting is enabled or disabled
- **THEN** approved repair requests in that provider's serviced categories are returned, as
  before this change

### Requirement: Offer submission is verification-status-aware
Submitting an offer on a repair request SHALL be rejected when the submitting provider's
verification status is `rejected`, regardless of the verification-required setting. It SHALL also
be rejected when the submitting provider's verification status is `pending` and the
verification-required setting is enabled. It SHALL be allowed when the submitting provider's
verification status is `verified`, or when it is `pending` and the verification-required setting
is disabled.

#### Scenario: Submitting an offer as a pending provider, verification required
- **WHEN** the owner of a `pending` provider submits an offer on a repair request that is open for
  offers, while the verification-required setting is enabled
- **THEN** the offer is rejected and no offer is created

#### Scenario: Submitting an offer as a pending provider, verification not required
- **WHEN** the owner of a `pending` provider submits an offer on a repair request that is open for
  offers, while the verification-required setting is disabled
- **THEN** the offer is created

#### Scenario: Submitting an offer as a rejected provider
- **WHEN** the owner of a `rejected` provider submits an offer on a repair request that is open
  for offers, whether the verification-required setting is enabled or disabled
- **THEN** the offer is rejected and no offer is created

#### Scenario: Submitting an offer as a verified provider
- **WHEN** the owner of a `verified` provider submits an offer on a repair request that is open
  for offers, whether the verification-required setting is enabled or disabled
- **THEN** the offer is created, as before this change
