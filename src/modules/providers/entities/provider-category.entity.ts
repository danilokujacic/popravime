import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Provider } from './provider.entity';
import { Category } from '../../categories/entities/category.entity';

@Index(['categoryId', 'providerId'])
@Entity('provider_categories')
export class ProviderCategory {
  @PrimaryColumn({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @PrimaryColumn({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
