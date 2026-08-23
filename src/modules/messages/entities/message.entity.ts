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
import { DirectInquiry } from '../../direct-inquiries/entities/direct-inquiry.entity';
import { User } from '../../users/entities/user.entity';

@Index(['requestId', 'createdAt'])
@Index(['inquiryId', 'createdAt'])
@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId: string | null;

  @ManyToOne(() => RepairRequest)
  @JoinColumn({ name: 'request_id' })
  request: RepairRequest | null;

  @Column({ name: 'inquiry_id', type: 'uuid', nullable: true })
  inquiryId: string | null;

  @ManyToOne(() => DirectInquiry)
  @JoinColumn({ name: 'inquiry_id' })
  inquiry: DirectInquiry | null;

  @Column({ name: 'sender_id', type: 'uuid' })
  @Index()
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl: string | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
