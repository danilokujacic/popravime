import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';

@Index(['categoryId', 'serviceType'])
@Entity('price_estimates')
export class PriceEstimate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'category_id', type: 'uuid' })
  @Index()
  categoryId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'service_type', type: 'text' })
  serviceType: string;

  @Column({ name: 'price_min', type: 'decimal', precision: 10, scale: 2 })
  priceMin: string;

  @Column({ name: 'price_max', type: 'decimal', precision: 10, scale: 2 })
  priceMax: string;

  @Column({ type: 'text', default: 'EUR' })
  currency: string;
}
