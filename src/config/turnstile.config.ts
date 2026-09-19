import { registerAs } from '@nestjs/config';

export interface TurnstileConfig {
  secretKey: string;
}

export const turnstileConfig = registerAs('turnstile', (): TurnstileConfig => ({
  secretKey: process.env.TURNSTILE_SECRET_KEY ?? '',
}));
