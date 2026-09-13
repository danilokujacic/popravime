import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// One row per outstanding "confirm this email" link — the FE page at /confirm-email/:slug reads
// `slug` out of the URL and posts it back to the backend (AuthController.ConfirmEmail), which
// looks the row up here, checks `expiresAt`, and flips the matching User.emailVerified. Deleted
// once consumed (or replaced wholesale when a fresh one is requested via resend) — single-use.
@Entity('email_confirmations')
export class EmailConfirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  slug: string;

  @Column({ type: 'text' })
  @Index()
  email: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
