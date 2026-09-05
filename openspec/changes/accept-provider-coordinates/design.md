## Context

See `proposal.md` - Why. `Provider.latitude`/`longitude` are already nullable
`decimal(9,6)` columns, and the response DTO already returns them as strings (e.g.
`"42.430400"`), matching how other decimal fields in this codebase (e.g. `price_min`/
`price_max` on offers) are validated as numeric strings on the way in
(`@IsNumberString()`) rather than as JSON numbers. `ProvidersService.Create` always calls
`IGeocodingService.Geocode(address)`; `Update` calls it only when `input.address !== undefined`.
Neither path currently has any way to bypass geocoding.

## Goals / Non-Goals

**Goals:**
- Let a caller supply exact coordinates on create/update, stored verbatim, with geocoding
  skipped whenever they do.
- Keep today's geocoding-fallback behavior byte-for-byte unchanged when coordinates aren't
  supplied.

**Non-Goals:**
- No change to the geocoding provider (Nominatim) or its client.
- No endpoint to explicitly clear existing coordinates back to `null` — out of scope; not
  requested, and the entity already allows `null` only as a geocode-failure outcome, not a
  caller-chosen state.

## Decisions

**1. Wire format: numeric strings, matching the existing decimal-field convention.**
`latitude`/`longitude` in `CreateProviderDto`/`UpdateProviderDto` are validated with
`@IsLatitude()`/`@IsLongitude()` (class-validator; both accept a string or a number and check
the actual geographic range, unlike `@IsNumberString()` which only checks numeric-string shape).
The validated value is assigned to the entity's string column with no reformatting — this is
what "stored exactly as sent" means: no round-trip through `parseFloat`/`toFixed`. Postgres
still applies its own `decimal(9,6)` rounding at the storage boundary, same as it already does
for geocoded values; that's an existing, unrelated constraint, not new behavior.
  - *Alternative considered*: accept JSON numbers and format them to a fixed-precision string
    before storing. Rejected — it would silently reformat a caller's input (e.g. trim or round
    trailing digits), which conflicts with "store them exactly as sent," and JSON numbers lose
    the ability to distinguish e.g. `19.0` from `19.00` the way a string preserves it.

**2. Both-or-neither pairing, enforced with a class-validator constraint.**
A `PairedCoordinates`-style `ValidatorConstraint` (same pattern as the existing
`CloseAfterOpenConstraint` for working hours) checks that `latitude` and `longitude` are either
both present or both absent on the DTO instance, applied on both `CreateProviderDto` and
`UpdateProviderDto`. This was not explicit in the request but is the only sane reading of
"optional latitude/longitude fields" for a single point — a lone coordinate can't be
geocoded-in for the other half without contradicting "store them exactly as sent."
  - *Alternative considered*: silently ignore a lone coordinate (treat it as if neither were
    sent) instead of rejecting. Rejected — silently dropping caller input a validation layer
    could catch is worse than a clear 400.

**3. `null` is treated the same as "not provided."**
Both fields are `@IsOptional()`, which class-validator already treats as "skip validation" for
either `undefined` or `null`. The service layer checks presence with `input.latitude != null &&
input.longitude != null` (loose equality, catching both) rather than distinguishing `null` from
`undefined` — there's no requested behavior that depends on the difference, and introducing one
now would be inventing scope.

**4. Skip geocoding entirely when both coordinates are supplied — don't call it and discard
the result.**
In `Create`, the `Geocode` call is skipped outright (not called-then-ignored) when both
coordinates are present, avoiding an unnecessary external HTTP call to Nominatim. In `Update`,
the existing `if (input.address !== undefined)` branch that geocodes is only entered when
coordinates are *not* both supplied; when they are, the city lookup that branch also does
(`citiesService.FindById`) is skipped too since it exists solely to build the geocoder query
string.

## Risks / Trade-offs

- [A caller could supply coordinates far from the given address/city (e.g. wrong country) with
  no server-side cross-check] → Accepted: the request explicitly asks for verbatim storage of
  caller-supplied coordinates, and range validation (`@IsLatitude`/`@IsLongitude`) is the only
  check in scope; cross-referencing against the address is a separate, unrequested feature.
- [`UpdateProviderDto` gains a class-level paired-fields constraint alongside the existing
  per-field ones — slightly more validation surface] → Low risk; follows an established pattern
  already in this DTO family (`CloseAfterOpenConstraint`).

## Migration Plan

No data migration — same columns, just a new way to populate them. Deploy as a normal backend
release.
