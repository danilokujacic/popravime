## 1. DTOs and validation

- [x] 1.1 Added `PairedCoordinatesConstraint` (`ValidatorConstraint`, same pattern as
      `close-after-open.validator.ts`) in `paired-coordinates.validator.ts`, applied to both
      `latitude` and `longitude` so whichever field is present triggers the pair check (a field
      left `@IsOptional()`-absent skips its own validators entirely, so the constraint can't
      live on only one field). No standalone constraint spec was added — like
      `CloseAfterOpenConstraint`, it has no dedicated spec file in this codebase and is instead
      exercised through the DTO-level tests in 1.2/1.3, which cover both-present, both-absent,
      and only-one-present. Verify with `pnpm test`.
- [x] 1.2 Added optional `latitude`/`longitude` fields to `CreateProviderDto`, validated with
      `@IsOptional() @IsLatitude()` / `@IsOptional() @IsLongitude()` plus the paired constraint
      from 1.1. Verified with a new `create-provider.dto.spec.ts`: no coordinates passes, a
      valid pair passes, single-field-only fails, out-of-range latitude/longitude each fail.
      Verify with `pnpm test`.
- [x] 1.3 Added the same optional `latitude`/`longitude` fields (with the same validation) to
      `UpdateProviderDto`. Verified with a new `update-provider.dto.spec.ts`: empty payload
      passes, valid pair passes, pair alongside an `address` change passes, single-field-only
      fails, out-of-range fails. Verify with `pnpm test`.

## 2. Service and controller wiring

- [x] 2.1 Added optional `latitude`/`longitude` to `CreateProviderInput` and
      `UpdateProviderInput` in `providers.types.ts`. Verify with `tsc` passing (no consumer
      left unaware of the new optional fields).
- [x] 2.2 In `ProvidersController.Create`/`Update`, `dto.latitude`/`dto.longitude` are now
      passed through to the service call. Verified by re-reading the controller methods for
      both fields being forwarded.
- [x] 2.3 In `ProvidersService.Create` (via a new `ResolveCreateCoordinates` helper), the
      `Geocode` call is skipped when both `input.latitude` and `input.longitude` are supplied
      and they're stored verbatim; otherwise the existing geocode-from-address behavior runs
      unchanged. Verified with unit tests: explicit coordinates supplied →
      `geocodingService.Geocode` not called and the provider is created with those exact
      values; no coordinates supplied → geocoding path still runs and its result is stored,
      same as before. Verify with `pnpm test`.
- [x] 2.4 In `ProvidersService.Update` (via a new `ApplyCoordinates` helper), when both
      `input.latitude` and `input.longitude` are supplied they're stored verbatim and both the
      city lookup and the `Geocode` call are skipped — even when `input.address` is also
      present in the same call. When neither is supplied and `input.address` is present, the
      existing geocode-from-the-new-address behavior runs unchanged. Verified with unit tests
      covering: coordinates only (address/geocoding untouched), address + coordinates together
      (geocoding and city lookup both skipped), address only (existing geocoding behavior
      unchanged), neither (coordinates and address both untouched). Verify with `pnpm test`.

## 3. Documentation

- [x] 3.1 Updated `FRONTEND_INTEGRATION.md` §5: the request-body line, response-shape note, and
      a new paragraph document the optional `latitude`/`longitude` fields, the both-or-neither
      rule, and that supplying them skips server-side geocoding (even alongside an `address`
      change on `PATCH`). Verified by re-reading the updated section for accuracy against the
      implemented behavior.

## 4. Full verification

- [x] 4.1 Ran `pnpm test`: 27 suites, 135 tests, all passed.
- [x] 4.2 Ran `tsc` (type-check): no errors.
