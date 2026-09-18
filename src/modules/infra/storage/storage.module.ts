import { Module } from '@nestjs/common';
import { StorageProvider } from './storage.provider';
import { StorageCleanupService } from './storage-cleanup.service';
import { FileUrlService } from './file-url.service';
import { PrivateFileUrlInterceptor } from './private-file-url.interceptor';
import { STORAGE_SERVICE } from '../../../common/constants/di-tokens';

@Module({
  providers: [
    StorageProvider,
    StorageCleanupService,
    FileUrlService,
    PrivateFileUrlInterceptor,
  ],
  exports: [
    STORAGE_SERVICE,
    StorageCleanupService,
    FileUrlService,
    PrivateFileUrlInterceptor,
  ],
})
export class StorageModule {}
