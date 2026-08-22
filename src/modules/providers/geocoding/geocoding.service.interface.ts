import { GeocodeResult } from './geocoding.types';

export interface IGeocodingService {
  Geocode(address: string): Promise<GeocodeResult | null>;
}
