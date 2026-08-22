import { registerAs } from '@nestjs/config';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
}

export const emailConfig = registerAs(
  'email',
  (): EmailConfig => ({
    host: process.env.EMAIL_HOST ?? 'localhost',
    port: Number(process.env.EMAIL_PORT ?? 1025),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || undefined,
    password: process.env.EMAIL_PASSWORD || undefined,
    from: process.env.EMAIL_FROM ?? 'no-reply@popravime.me',
  }),
);
