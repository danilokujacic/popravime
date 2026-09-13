import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './entities/city.entity';
import { ListCitiesFilter } from './cities.types';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';

@Injectable()
export class CitiesRepository {
  constructor(
    @InjectRepository(City)
    private readonly repository: Repository<City>,
  ) {}

  List(filter: ListCitiesFilter): Promise<City[]> {
    return this.repository.find({
      where: {
        region: filter.region,
        isActive: filter.isActive,
      },
      order: { name: 'ASC' },
    });
  }

  FindById(id: string): Promise<City | null> {
    return this.repository.findOne({ where: { id } });
  }

  FindBySlug(slug: string): Promise<City | null> {
    return this.repository.findOne({ where: { slug } });
  }

  async IncrementProviderCount(cityId: string): Promise<void> {
    await this.repository.increment({ id: cityId }, 'providerCount', 1);
  }

  async DecrementProviderCount(cityId: string): Promise<void> {
    await this.repository.decrement({ id: cityId }, 'providerCount', 1);
  }

  async Save(city: City): Promise<City> {
    try {
      return await this.repository.save(city);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  TopByProviderCount(limit: number): Promise<City[]> {
    return this.repository.find({
      order: { providerCount: 'DESC' },
      take: limit,
    });
  }
}
