import { registerAs } from '@nestjs/config';

export interface VerificationConfig {
  required: boolean;
}

export const verificationConfig = registerAs('verification', (): VerificationConfig => ({
  required: process.env.VERIFICATION_REQUIRED !== 'false',
}));
