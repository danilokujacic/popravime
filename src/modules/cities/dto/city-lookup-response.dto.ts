import { CityResponseDto } from './city-response.dto';

// Wrapped rather than a bare nullable body: "no known city at this point" is an expected, valid
// outcome (open countryside, just outside a municipality boundary, etc.), not an error — the
// frontend is expected to fall back to manual city selection when `city` comes back null.
export class CityLookupResponseDto {
  city: CityResponseDto | null;
}
