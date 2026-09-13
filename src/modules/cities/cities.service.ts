import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CitiesRepository } from './cities.repository';
import { City } from './entities/city.entity';
import { ListCitiesFilter } from './cities.types';
import { ICitiesService } from './cities.service.interface';
import { CacheService } from '../infra/cache/cache.service';
import { CACHE_KEYS } from '../infra/cache/cache-keys.constants';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import type { IGeocodingService } from '../infra/geocoding/geocoding.service.interface';
import { ReverseGeocodeResult } from '../infra/geocoding/geocoding.types';
import { GEOCODING_SERVICE } from '../../common/constants/di-tokens';
import { SlugGenerator } from '../../shared/slug/slug.generator';

const CITIES_CACHE_TTL_SECONDS = 3600;

function BuildListCacheKey(filter: ListCitiesFilter): string {
  return `${CACHE_KEYS.CITIES_LIST}:${filter.region ?? '*'}:${filter.isActive ?? '*'}`;
}

@Injectable()
export class CitiesService implements ICitiesService {
  constructor(
    private readonly citiesRepository: CitiesRepository,
    private readonly cacheService: CacheService,
    @Inject(GEOCODING_SERVICE)
    private readonly geocodingService: IGeocodingService,
    @InjectPinoLogger(CitiesService.name)
    private readonly logger: PinoLogger,
  ) {}

  List(filter: ListCitiesFilter): Promise<City[]> {
    return this.cacheService.GetOrSet(
      BuildListCacheKey(filter),
      () => this.citiesRepository.List(filter),
      CITIES_CACHE_TTL_SECONDS,
    );
  }

  async FindById(id: string): Promise<City> {
    const city = await this.citiesRepository.FindById(id);
    if (!city) {
      throw new DomainNotFoundException('CITY_NOT_FOUND', 'City not found');
    }
    return city;
  }

  IncrementProviderCount(cityId: string): Promise<void> {
    return this.citiesRepository.IncrementProviderCount(cityId);
  }

  DecrementProviderCount(cityId: string): Promise<void> {
    return this.citiesRepository.DecrementProviderCount(cityId);
  }

  TopByProviderCount(limit: number): Promise<City[]> {
    return this.citiesRepository.TopByProviderCount(limit);
  }

  // Reverse-geocodes a point, then matches Nominatim's address breakdown against our own known
  // municipality list by slug (same transliteration used to build each city's own slug), rather
  // than trusting Nominatim's spelling/diacritics to match our `name` column exactly. Candidates
  // are tried most to least specific — Montenegro's municipalities usually land in `city` or
  // `municipality` depending on how OSM tagged that particular area, but a couple of smaller
  // towns only appear under `county` in Nominatim's Montenegro data.
  async FindByCoordinates(
    latitude: string,
    longitude: string,
  ): Promise<City | null> {
    const result = await this.geocodingService.ReverseGeocode(
      latitude,
      longitude,
    );
    if (!result) return null;

    for (const candidate of this.CandidateNames(result)) {
      const city = await this.citiesRepository.FindBySlug(
        SlugGenerator.Generate(candidate),
      );
      if (city && city.isActive) return city;
    }

    this.logger.info(
      { latitude, longitude, result },
      'Reverse geocoding matched no known city',
    );
    return null;
  }

  private CandidateNames(result: ReverseGeocodeResult): string[] {
    return [
      result.city,
      result.town,
      result.village,
      result.municipality,
      result.county,
    ].filter((name): name is string => !!name);
  }
}
