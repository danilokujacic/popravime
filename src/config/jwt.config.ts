import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  accessSecret: string;
  accessExpiresInSeconds: number;
  refreshSecret: string;
  refreshExpiresInSeconds: number;
}

export const jwtConfig = registerAs('jwt', (): JwtConfig => ({
  accessSecret: process.env.JWT_SECRET ?? '',
  accessExpiresInSeconds: Number(
    process.env.JWT_ACCESS_EXPIRES_IN_SECONDS ?? 900,
  ),
  refreshSecret: process.env.REFRESH_SECRET ?? '',
  refreshExpiresInSeconds: Number(
    process.env.JWT_REFRESH_EXPIRES_IN_SECONDS ?? 604800,
  ),
}));
