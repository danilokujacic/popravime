import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationRequest } from './entities/verification-request.entity';
import { VerificationRequestsRepository } from './verification-requests.repository';
import { VerificationRequestsService } from './verification-requests.service';
import { VerificationRequestsController } from './verification-requests.controller';
import { ProvidersModule } from '../providers/providers.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StorageModule } from '../infra/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationRequest]),
    ProvidersModule,
    UsersModule,
    NotificationsModule,
    AuditLogsModule,
    StorageModule,
  ],
  controllers: [VerificationRequestsController],
  providers: [VerificationRequestsRepository, VerificationRequestsService],
  exports: [VerificationRequestsService],
})
export class VerificationRequestsModule {}
