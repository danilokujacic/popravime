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
  // Per client IP per TTL, for every route without its own tighter limit (auth, offers, inquiries,
  // messages… — see rate-limit.constants.ts). High enough that a search-engine crawler never hits
  // it: each server-rendered frontend page makes ~2–3 API calls, and until BFF_SHARED_SECRET is set
  // on both sides every page render counts against the frontend server's single IP.
  defaultLimit: Number(process.env.THROTTLE_DEFAULT_LIMIT ?? 3000),
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
