## Purpose

Governs how a provider's map coordinates are determined when the profile is created or
updated — either supplied directly by the caller or derived automatically from the address.

## ADDED Requirements

### Requirement: Caller-supplied coordinates on creation
When creating a provider, the caller MAY supply `latitude` and `longitude` directly. When both
are supplied, they SHALL be stored exactly as sent and the address SHALL NOT be geocoded. When
neither is supplied, the coordinates SHALL be derived from the address via geocoding, as before
this change.

#### Scenario: Creating a provider with explicit coordinates
- **WHEN** a caller creates a provider and supplies both `latitude` and `longitude`
- **THEN** the provider is stored with exactly those coordinate values and no geocoding lookup
  is performed for its address

#### Scenario: Creating a provider without coordinates
- **WHEN** a caller creates a provider and supplies neither `latitude` nor `longitude`
- **THEN** the provider's coordinates are derived from its address via geocoding, as before this
  change

### Requirement: Caller-supplied coordinates on update
When updating a provider, the caller MAY supply `latitude` and `longitude` directly, independent
of whether `address` is also being changed in the same request. When both are supplied, they
SHALL be stored exactly as sent and the address SHALL NOT be geocoded, even if `address` is also
being changed in the same request. When neither is supplied and `address` is being changed, the
coordinates SHALL be re-derived from the new address via geocoding, as before this change. When
neither is supplied and `address` is not being changed, the provider's existing coordinates are
left untouched.

#### Scenario: Updating only the coordinates
- **WHEN** a caller updates a provider and supplies both `latitude` and `longitude`, without
  changing `address`
- **THEN** the provider's coordinates are stored exactly as sent and its address is unchanged

#### Scenario: Updating coordinates and address together
- **WHEN** a caller updates a provider and supplies `address` together with both `latitude` and
  `longitude`
- **THEN** the provider's coordinates are stored exactly as sent and no geocoding lookup is
  performed, even though the address also changed

#### Scenario: Updating only the address
- **WHEN** a caller updates a provider's `address` and supplies neither `latitude` nor
  `longitude`
- **THEN** the provider's coordinates are re-derived from the new address via geocoding, as
  before this change

### Requirement: Coordinates must be provided as a complete pair
Supplying only one of `latitude`/`longitude` SHALL be rejected as invalid, on both creation and
update.

#### Scenario: Supplying latitude without longitude
- **WHEN** a caller creates or updates a provider supplying `latitude` but not `longitude`
- **THEN** the request is rejected as invalid and no provider data is changed

#### Scenario: Supplying longitude without latitude
- **WHEN** a caller creates or updates a provider supplying `longitude` but not `latitude`
- **THEN** the request is rejected as invalid and no provider data is changed
