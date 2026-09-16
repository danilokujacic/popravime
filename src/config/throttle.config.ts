import { registerAs } from '@nestjs/config';

export interface ThrottleConfig {
  defaultLimit: number;
  defaultTtlMs: number;
  authLimit: number;
  authTtlMs: number;
  resendConfirmationLimit: number;
  resendConfirmationTtlMs: number;
}

export const throttleConfig = registerAs('throttle', (): ThrottleConfig => ({
  defaultLimit: Number(process.env.THROTTLE_DEFAULT_LIMIT ?? 100),
  defaultTtlMs: Number(process.env.THROTTLE_DEFAULT_TTL_MS ?? 60000),
  authLimit: Number(process.env.THROTTLE_AUTH_LIMIT ?? 5),
  authTtlMs: Number(process.env.THROTTLE_AUTH_TTL_MS ?? 60000),
  resendConfirmationLimit: Number(
    process.env.THROTTLE_RESEND_CONFIRMATION_LIMIT ?? 1,
  ),
  resendConfirmationTtlMs: Number(
    process.env.THROTTLE_RESEND_CONFIRMATION_TTL_MS ?? 60000,
  ),
}));
