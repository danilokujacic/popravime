import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OAuthProvider, UserRole } from '../users.types';

@Index(['oauthProvider', 'oauthId'], { unique: true })
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'text', select: false })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'text' })
  fullName: string;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
    default: UserRole.Customer,
  })
  role: UserRole;

  @Column({
    name: 'oauth_provider',
    type: 'enum',
    enum: OAuthProvider,
    enumName: 'oauth_provider_enum',
    nullable: true,
  })
  oauthProvider: OAuthProvider | null;

  @Column({ name: 'oauth_id', type: 'text', nullable: true })
  oauthId: string | null;

  // Column has existed since the original migration but was never mapped/used until the email
  // confirmation flow — OAuth accounts are always created true (the provider already verified
  // that email), a plain registration starts false and flips true via EmailConfirmationsService.
  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
