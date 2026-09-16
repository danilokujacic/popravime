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
import {
  NotificationMessageParams,
  NotificationType,
} from '../notifications.types';

@Index(['userId', 'isRead', 'createdAt'])
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
    enumName: 'notification_type_enum',
  })
  type: NotificationType;

  @Column({ name: 'message_key', type: 'text' })
  messageKey: string;

  @Column({ name: 'message_params', type: 'jsonb', nullable: true })
  messageParams: NotificationMessageParams | null;

  @Column({ name: 'related_entity_type', type: 'text', nullable: true })
  relatedEntityType: string | null;

  @Column({ name: 'related_entity_id', type: 'uuid', nullable: true })
  relatedEntityId: string | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
