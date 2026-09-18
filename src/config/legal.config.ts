import { registerAs } from '@nestjs/config';

export interface LegalConfig {
  termsVersion: string;
  termsCacheTtlSeconds: number;
}

export const legalConfig = registerAs('legal', (): LegalConfig => ({
  termsVersion: process.env.LEGAL_TERMS_VERSION ?? '2026-09-18',
  termsCacheTtlSeconds: Number(
    process.env.LEGAL_TERMS_CACHE_TTL_SECONDS ?? 300,
  ),
}));
