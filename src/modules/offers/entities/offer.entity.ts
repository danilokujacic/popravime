import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RepairRequest } from '../../repair-requests/entities/repair-request.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { OfferStatus, PartsType } from '../offers.types';

@Index(['requestId', 'status'])
@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'uuid' })
  @Index()
  requestId: string;

  @ManyToOne(() => RepairRequest)
  @JoinColumn({ name: 'request_id' })
  request: RepairRequest;

  @Column({ name: 'provider_id', type: 'uuid' })
  @Index()
  providerId: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @Column({ name: 'price_min', type: 'decimal', precision: 10, scale: 2 })
  priceMin: string;

  @Column({ name: 'price_max', type: 'decimal', precision: 10, scale: 2 })
  priceMax: string;

  @Column({ name: 'estimated_duration', type: 'text' })
  estimatedDuration: string;

  @Column({
    name: 'parts_type',
    type: 'enum',
    enum: PartsType,
    enumName: 'parts_type_enum',
  })
  partsType: PartsType;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({
    type: 'enum',
    enum: OfferStatus,
    enumName: 'offer_status_enum',
    default: OfferStatus.Pending,
  })
  status: OfferStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
