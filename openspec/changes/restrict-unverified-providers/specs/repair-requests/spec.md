## Purpose

Governs which providers may see and act on customer repair requests, so only businesses
Popravime has verified can respond to customers.

## ADDED Requirements

### Requirement: Only a verified provider's owner can see repair requests
A provider owner SHALL only be able to list or view repair requests through a provider that is
`verified`. An owner whose only provider is `pending` or `rejected` is treated as having no
serviced categories for repair-request visibility purposes.

#### Scenario: Listing as the owner of a pending provider
- **WHEN** the owner of a `pending` provider lists repair requests
- **THEN** the result is empty, even if an approved repair request exists in a category that
  provider services

#### Scenario: Listing as the owner of a rejected provider
- **WHEN** the owner of a `rejected` provider lists repair requests
- **THEN** the result is empty, even if an approved repair request exists in a category that
  provider services

#### Scenario: Viewing a specific repair request as the owner of a pending provider
- **WHEN** the owner of a `pending` provider requests a specific approved repair request by ID
  in a category that provider services
- **THEN** the request is denied

#### Scenario: Listing as the owner of a verified provider
- **WHEN** the owner of a `verified` provider lists repair requests
- **THEN** approved repair requests in that provider's serviced categories are returned, as
  before this change

### Requirement: Only a verified provider may submit an offer
Submitting an offer on a repair request SHALL be rejected when the submitting provider's
verification status is not `verified`.

#### Scenario: Submitting an offer as a pending provider
- **WHEN** the owner of a `pending` provider submits an offer on a repair request that is open
  for offers
- **THEN** the offer is rejected and no offer is created

#### Scenario: Submitting an offer as a rejected provider
- **WHEN** the owner of a `rejected` provider submits an offer on a repair request that is open
  for offers
- **THEN** the offer is rejected and no offer is created

#### Scenario: Submitting an offer as a verified provider
- **WHEN** the owner of a `verified` provider submits an offer on a repair request that is open
  for offers
- **THEN** the offer is created, as before this change
