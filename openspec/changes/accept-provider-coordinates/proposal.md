## Why

`POST /providers` and `PATCH /providers/:id` always derive `latitude`/`longitude` from the
address via server-side geocoding (Nominatim), even when the caller — e.g. a provider owner
pinning their exact location on a map — already knows the precise coordinates. Geocoding an
address string is an approximation and can miss (`geocode?.latitude ?? null` on any failure or
no-match), so there's currently no way to supply an accurate location for a provider whose
address doesn't geocode well, or to make small manual corrections without also changing the
address text.

## What Changes

- `POST /providers` accepts optional `latitude`/`longitude` fields. When both are provided, they
  are stored exactly as sent and the address is not geocoded. When neither is provided, behavior
  is unchanged: the address is geocoded as today.
- `PATCH /providers/:id` accepts the same optional `latitude`/`longitude` fields, independently
  of whether `address` is also being updated in the same request. When both are provided, they
  are stored exactly as sent, and geocoding is skipped even if `address` changed in the same
  request. When neither is provided, behavior is unchanged: geocoding only runs (from the new or
  existing address) when `address` is part of the request.
- Providing only one of `latitude`/`longitude` (not both) is rejected as invalid — a partial
  coordinate pair is never accepted.

## Capabilities

### New Capabilities
- `providers`: request-level control over how a provider's map coordinates are set — either
  supplied directly by the caller or derived from the address via geocoding.

  (No main spec exists yet for the `providers` capability — the in-progress
  `restrict-unverified-providers` change is also introducing it, for a different requirement
  (directory visibility). Until one of the two changes is archived, this delta and that one
  each describe part of the same not-yet-existing capability; they don't conflict because they
  add different requirements.)

### Modified Capabilities
(none — no existing specs predate this change)

## Impact

- `src/modules/providers/dto/create-provider.dto.ts`,
  `src/modules/providers/dto/update-provider.dto.ts`: add optional `latitude`/`longitude`
  fields, validated as valid coordinate values, and paired (both-or-neither).
- `src/modules/providers/providers.types.ts`: `CreateProviderInput`/`UpdateProviderInput` gain
  optional `latitude`/`longitude`.
- `src/modules/providers/providers.controller.ts`: pass the new fields through to the service.
- `src/modules/providers/providers.service.ts`: `Create` skips the `Geocode` call when both
  coordinates are supplied; `Update` skips it (even when `address` also changed) when both
  coordinates are supplied in the same request.
- `FRONTEND_INTEGRATION.md` §5 currently tells the frontend "latitude/longitude ... the frontend
  never sends them and shouldn't expose fields to edit them" — needs updating to document the
  new optional fields and the both-or-neither rule.
- Existing tests to add/update: no unit tests currently exist for
  `ProvidersService.Create`/`Update`'s geocoding branch — new coverage is needed for both the
  manual-coordinates path and the unchanged geocoding-fallback path.
