import { GeocodeResult, ReverseGeocodeResult } from './geocoding.types';

export interface IGeocodingService {
  Geocode(address: string): Promise<GeocodeResult | null>;
  ReverseGeocode(
    latitude: string,
    longitude: string,
  ): Promise<ReverseGeocodeResult | null>;
}
