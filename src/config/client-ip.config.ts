import { registerAs } from '@nestjs/config';

export interface ClientIpConfig {
  bffSharedSecret: string;
}

export const clientIpConfig = registerAs('clientIp', (): ClientIpConfig => ({
  bffSharedSecret: process.env.BFF_SHARED_SECRET ?? '',
}));
