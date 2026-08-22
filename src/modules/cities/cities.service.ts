import { Injectable } from '@nestjs/common';
import { CitiesRepository } from './cities.repository';
import { City } from './entities/city.entity';
import { ListCitiesFilter } from './cities.types';
import { ICitiesService } from './cities.service.interface';
import { CacheService } from '../infra/cache/cache.service';
import { CACHE_KEYS } from '../infra/cache/cache-keys.constants';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';

const CITIES_CACHE_TTL_SECONDS = 3600;

function BuildListCacheKey(filter: ListCitiesFilter): string {
  return `${CACHE_KEYS.CITIES_LIST}:${filter.region ?? '*'}:${filter.isActive ?? '*'}`;
}

@Injectable()
export class CitiesService implements ICitiesService {
  constructor(
    private readonly citiesRepository: CitiesRepository,
    private readonly cacheService: CacheService,
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
}
