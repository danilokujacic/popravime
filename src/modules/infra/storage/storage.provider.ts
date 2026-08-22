import { FactoryProvider } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { storageConfig } from '../../../config/storage.config';
import { S3StorageService } from './s3-storage.service';
import { STORAGE_SERVICE } from '../../../common/constants/di-tokens';

export const StorageProvider: FactoryProvider = {
  provide: STORAGE_SERVICE,
  inject: [storageConfig.KEY],
  useFactory: (config: ConfigType<typeof storageConfig>) =>
    new S3StorageService(config),
};
