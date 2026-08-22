import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IGeocodingService } from './geocoding.service.interface';
import { GeocodeResult } from './geocoding.types';
import { geocodingConfig } from '../../../config/geocoding.config';

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

interface NominatimResult {
  lat: string;
  lon: string;
}

function IsNominatimResultArray(value: unknown): value is NominatimResult[] {
  return Array.isArray(value);
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

      if (!IsNominatimResultArray(response.data) || response.data.length === 0) {
        this.logger.warn({ address }, 'Geocoding found no results');
        return null;
      }

      const [result] = response.data;
      return { latitude: result.lat, longitude: result.lon };
    } catch (error) {
      this.logger.error(
        { address, message: error instanceof Error ? error.message : 'unknown error' },
        'Geocoding request failed',
      );
      return null;
    }
  }
}
