import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { ListCategoriesFilter } from './categories.types';

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
  ) {}

  List(filter: ListCategoriesFilter): Promise<Category[]> {
    return this.repository.find({
      where: { parentCategoryId: filter.parentCategoryId },
      order: { name: 'ASC' },
    });
  }

  FindById(id: string): Promise<Category | null> {
    return this.repository.findOne({ where: { id } });
  }
}
