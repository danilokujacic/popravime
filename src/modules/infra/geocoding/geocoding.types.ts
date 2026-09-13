export interface GeocodeResult {
  latitude: string;
  longitude: string;
}

// The handful of Nominatim `address` breakdown fields that can hold a Montenegrin municipality
// name, ordered most to least specific — see NominatimClient.ReverseGeocode for why order matters.
export interface ReverseGeocodeResult {
  city: string | null;
  town: string | null;
  village: string | null;
  municipality: string | null;
  county: string | null;
}
