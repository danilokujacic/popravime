import { Category } from './entities/category.entity';
import { ListCategoriesFilter } from './categories.types';

export interface ICategoriesService {
  List(filter: ListCategoriesFilter): Promise<Category[]>;
  FindById(id: string): Promise<Category>;
}
