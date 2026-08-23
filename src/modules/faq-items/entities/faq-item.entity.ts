import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index(['category', 'sortOrder'])
@Entity('faq_items')
export class FaqItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'text' })
  category: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;
}
