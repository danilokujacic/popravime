import { registerAs } from '@nestjs/config';

export interface GeocodingConfig {
  userAgent: string;
}

export const geocodingConfig = registerAs(
  'geocoding',
  (): GeocodingConfig => ({
    userAgent: process.env.GEOCODING_USER_AGENT ?? '',
  }),
);
