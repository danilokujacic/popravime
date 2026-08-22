import { Module } from '@nestjs/common';
import { StorageProvider } from './storage.provider';
import { STORAGE_SERVICE } from '../../../common/constants/di-tokens';

@Module({
  providers: [StorageProvider],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
