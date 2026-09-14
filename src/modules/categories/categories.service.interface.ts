import { Category } from './entities/category.entity';
import { ListCategoriesFilter } from './categories.types';
import { CategoryWithProviderCount } from './categories.repository';

export interface ICategoriesService {
  List(filter: ListCategoriesFilter): Promise<Category[]>;
  ListWithProviderCounts(): Promise<CategoryWithProviderCount[]>;
  FindById(id: string): Promise<Category>;
}
