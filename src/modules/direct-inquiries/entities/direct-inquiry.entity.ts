import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { InquiryStatus } from '../direct-inquiries.types';

@Index(['providerId', 'status'])
@Entity('direct_inquiries')
export class DirectInquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  @Index()
  customerId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer: User | null;

  @Column({ name: 'provider_id', type: 'uuid' })
  @Index()
  providerId: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @Column({ type: 'text', nullable: true })
  name: string | null;

  @Column({ name: 'contact_email', type: 'text', nullable: true })
  contactEmail: string | null;

  @Column({ name: 'contact_phone', type: 'text', nullable: true })
  contactPhone: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: InquiryStatus,
    enumName: 'inquiry_status_enum',
    default: InquiryStatus.New,
  })
  status: InquiryStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
