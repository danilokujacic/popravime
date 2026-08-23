import { City } from './entities/city.entity';
import { ListCitiesFilter } from './cities.types';

export interface ICitiesService {
  List(filter: ListCitiesFilter): Promise<City[]>;
  FindById(id: string): Promise<City>;
  IncrementProviderCount(cityId: string): Promise<void>;
  DecrementProviderCount(cityId: string): Promise<void>;
  TopByProviderCount(limit: number): Promise<City[]>;
}
