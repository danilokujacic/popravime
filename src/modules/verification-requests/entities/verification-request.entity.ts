import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Provider } from '../../providers/entities/provider.entity';
import { User } from '../../users/entities/user.entity';
import { VerificationRequestStatus } from '../verification-requests.types';

@Index(['providerId', 'status'])
@Entity('verification_requests')
export class VerificationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  @Index()
  providerId: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @Column({ name: 'document_url', type: 'text' })
  documentUrl: string;

  @Column({ name: 'apr_number', type: 'text' })
  aprNumber: string;

  @Column({
    type: 'enum',
    enum: VerificationRequestStatus,
    enumName: 'verification_request_status_enum',
    default: VerificationRequestStatus.Pending,
  })
  status: VerificationRequestStatus;

  @Column({ name: 'reviewed_by_admin_id', type: 'uuid', nullable: true })
  reviewedByAdminId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewed_by_admin_id' })
  reviewedByAdmin: User | null;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string | null;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;
}
