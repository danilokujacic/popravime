import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContactMessageStatus } from '../contact-messages.types';

@Entity('contact_messages')
export class ContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  email: string;

  @Column({ type: 'text' })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: ContactMessageStatus,
    enumName: 'contact_message_status_enum',
    default: ContactMessageStatus.New,
  })
  @Index()
  status: ContactMessageStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
