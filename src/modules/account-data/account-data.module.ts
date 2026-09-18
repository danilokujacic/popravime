import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountDataController } from './account-data.controller';
import { AccountErasureRepository } from './account-erasure.repository';
import { AccountErasureService } from './account-erasure.service';
import { AccountExportRepository } from './account-export.repository';
import { AccountExportService } from './account-export.service';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StorageModule } from '../infra/storage/storage.module';
import { User } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';
import { RepairRequest } from '../repair-requests/entities/repair-request.entity';
import { Message } from '../messages/entities/message.entity';
import { Review } from '../reviews/entities/review.entity';
import { DirectInquiry } from '../direct-inquiries/entities/direct-inquiry.entity';
import { Notification } from '../notifications/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Provider,
      RepairRequest,
      Message,
      Review,
      DirectInquiry,
      Notification,
    ]),
    AuthModule,
    AuditLogsModule,
    StorageModule,
  ],
  controllers: [AccountDataController],
  providers: [
    AccountErasureRepository,
    AccountErasureService,
    AccountExportRepository,
    AccountExportService,
  ],
  exports: [AccountErasureService],
})
export class AccountDataModule {}
