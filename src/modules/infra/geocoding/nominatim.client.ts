import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IGeocodingService } from './geocoding.service.interface';
import { GeocodeResult, ReverseGeocodeResult } from './geocoding.types';
import { geocodingConfig } from '../../../config/geocoding.config';

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

interface NominatimResult {
  lat: string;
  lon: string;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
}

interface NominatimReverseResult {
  address?: NominatimAddress;
}

function IsNominatimResultArray(value: unknown): value is NominatimResult[] {
  return Array.isArray(value);
}

function IsNominatimReverseResult(
  value: unknown,
): value is NominatimReverseResult {
  return typeof value === 'object' && value !== null;
}

@Injectable()
export class NominatimClient implements IGeocodingService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(geocodingConfig.KEY)
    private readonly config: ConfigType<typeof geocodingConfig>,
    @InjectPinoLogger(NominatimClient.name)
    private readonly logger: PinoLogger,
  ) {}

  async Geocode(address: string): Promise<GeocodeResult | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<unknown>(NOMINATIM_SEARCH_URL, {
          params: { q: address, format: 'json', limit: 1, countrycodes: 'me' },
          headers: { 'User-Agent': this.config.userAgent },
        }),
      );

      if (
        !IsNominatimResultArray(response.data) ||
        response.data.length === 0
      ) {
        this.logger.warn('Geocoding found no results');
        return null;
      }

      const [result] = response.data;
      return { latitude: result.lat, longitude: result.lon };
    } catch (error) {
      this.logger.error(
        {
          message: error instanceof Error ? error.message : 'unknown error',
        },
        'Geocoding request failed',
      );
      return null;
    }
  }

  async ReverseGeocode(
    latitude: string,
    longitude: string,
  ): Promise<ReverseGeocodeResult | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<unknown>(NOMINATIM_REVERSE_URL, {
          params: {
            lat: latitude,
            lon: longitude,
            format: 'json',
            addressdetails: 1,
            zoom: 12, // city/town/village level — see https://nominatim.org/release-docs/latest/api/Reverse/#result-limitation
          },
          headers: { 'User-Agent': this.config.userAgent },
        }),
      );

      if (!IsNominatimReverseResult(response.data)) {
        this.logger.warn(
          { latitude, longitude },
          'Reverse geocoding found no results',
        );
        return null;
      }

      const address = response.data.address ?? {};
      return {
        city: address.city ?? null,
        town: address.town ?? null,
        village: address.village ?? null,
        municipality: address.municipality ?? null,
        county: address.county ?? null,
      };
    } catch (error) {
      this.logger.error(
        {
          latitude,
          longitude,
          message: error instanceof Error ? error.message : 'unknown error',
        },
        'Reverse geocoding request failed',
      );
      return null;
    }
  }
}
