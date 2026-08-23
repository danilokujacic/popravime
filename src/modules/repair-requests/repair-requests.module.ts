import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepairRequest } from './entities/repair-request.entity';
import { RepairRequestsRepository } from './repair-requests.repository';
import { RepairRequestsService } from './repair-requests.service';
import { RepairRequestsController } from './repair-requests.controller';
import { StorageModule } from '../infra/storage/storage.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RepairRequest]),
    StorageModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [RepairRequestsController],
  providers: [RepairRequestsRepository, RepairRequestsService],
  exports: [RepairRequestsService],
})
export class RepairRequestsModule {}
