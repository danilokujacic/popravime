import { registerAs } from '@nestjs/config';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
  enabled: boolean;
  dailyLimit: number;
  dailyCriticalReserve: number;
}

export const emailConfig = registerAs('email', (): EmailConfig => ({
  host: process.env.EMAIL_HOST ?? 'localhost',
  port: Number(process.env.EMAIL_PORT ?? 1025),
  secure: process.env.EMAIL_SECURE === 'true',
  user: process.env.EMAIL_USER || undefined,
  password: process.env.EMAIL_PASSWORD || undefined,
  from: process.env.EMAIL_FROM ?? 'no-reply@popravime.me',
  enabled: process.env.EMAIL_ENABLED !== 'false',
  dailyLimit: Number(process.env.EMAIL_DAILY_LIMIT ?? 250),
  dailyCriticalReserve: Number(process.env.EMAIL_DAILY_CRITICAL_RESERVE ?? 25),
}));
