import { registerAs } from '@nestjs/config';

export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  forcePathStyle: boolean;
  publicUrl: string;
}

export const storageConfig = registerAs('storage', (): StorageConfig => ({
  endpoint: process.env.STORAGE_ENDPOINT ?? '',
  region: process.env.STORAGE_REGION ?? 'auto',
  bucket: process.env.STORAGE_BUCKET ?? '',
  accessKey: process.env.STORAGE_ACCESS_KEY ?? '',
  secretKey: process.env.STORAGE_SECRET_KEY ?? '',
  forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== 'false',
  publicUrl: process.env.STORAGE_PUBLIC_URL ?? '',
}));
