import { registerAs } from '@nestjs/config';

export interface LegalConfig {
  termsVersion: string;
}

export const legalConfig = registerAs('legal', (): LegalConfig => ({
  termsVersion: process.env.LEGAL_TERMS_VERSION ?? '2026-09-18',
}));
