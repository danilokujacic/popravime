import { registerAs } from '@nestjs/config';

export interface EmailConfirmationConfig {
  ttlSeconds: number;
}

export const emailConfirmationConfig = registerAs(
  'emailConfirmation',
  (): EmailConfirmationConfig => ({
    ttlSeconds: Number(process.env.EMAIL_CONFIRMATION_TTL_SECONDS ?? 86400),
  }),
);
