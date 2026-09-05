import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { City } from '../../cities/entities/city.entity';
import { Offer } from '../../offers/entities/offer.entity';
import { RequestStatus, Urgency } from '../repair-requests.types';

@Index(['status', 'cityId'])
@Index(['customerId', 'status'])
@Entity('repair_requests')
export class RepairRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'text', nullable: true })
  brand: string | null;

  @Column({ type: 'text', nullable: true })
  model: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'photo_urls', type: 'text', array: true, default: '{}' })
  photoUrls: string[];

  @Column({ name: 'city_id', type: 'uuid' })
  cityId: string;

  @ManyToOne(() => City)
  @JoinColumn({ name: 'city_id' })
  city: City;

  @Column({
    type: 'enum',
    enum: Urgency,
    enumName: 'urgency_enum',
    default: Urgency.Standard,
  })
  urgency: Urgency;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    enumName: 'request_status_enum',
    default: RequestStatus.PendingReview,
  })
  status: RequestStatus;

  @Column({ name: 'accepted_offer_id', type: 'uuid', nullable: true })
  acceptedOfferId: string | null;

  @ManyToOne(() => Offer)
  @JoinColumn({ name: 'accepted_offer_id' })
  acceptedOffer: Offer | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
