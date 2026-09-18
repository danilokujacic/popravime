import { registerAs } from '@nestjs/config';

export interface RetentionConfig {
  inactiveAccountsDays: number;
  completedRequestsDays: number;
  unacceptedRequestsDays: number;
  inquiriesDays: number;
  contactMessagesDays: number;
  batchSize: number;
  schedulePattern: string;
}

export const retentionConfig = registerAs('retention', (): RetentionConfig => ({
  inactiveAccountsDays: Number(
    process.env.RETENTION_INACTIVE_ACCOUNTS_DAYS ?? 60,
  ),
  completedRequestsDays: Number(
    process.env.RETENTION_COMPLETED_REQUESTS_DAYS ?? 730,
  ),
  unacceptedRequestsDays: Number(
    process.env.RETENTION_UNACCEPTED_REQUESTS_DAYS ?? 180,
  ),
  inquiriesDays: Number(process.env.RETENTION_INQUIRIES_DAYS ?? 365),
  contactMessagesDays: Number(
    process.env.RETENTION_CONTACT_MESSAGES_DAYS ?? 365,
  ),
  batchSize: Number(process.env.RETENTION_BATCH_SIZE ?? 500),
  schedulePattern: process.env.RETENTION_SCHEDULE ?? '0 3 * * *',
}));
