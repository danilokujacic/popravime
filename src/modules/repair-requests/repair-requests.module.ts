import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { RepairRequest } from './entities/repair-request.entity';
import { RepairRequestsRepository } from './repair-requests.repository';
import { RepairRequestsService } from './repair-requests.service';
import { RepairRequestsController } from './repair-requests.controller';
import { StorageModule } from '../infra/storage/storage.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProvidersModule } from '../providers/providers.module';
import { CategoriesModule } from '../categories/categories.module';
import { CitiesModule } from '../cities/cities.module';
import { OffersModule } from '../offers/offers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RepairRequest]),
    JwtModule.register({}),
    StorageModule,
    UsersModule,
    NotificationsModule,
    AuditLogsModule,
    ProvidersModule,
    CategoriesModule,
    CitiesModule,
    // OffersModule also imports RepairRequestsModule (offer creation/acceptance needs the
    // request) — forwardRef breaks the otherwise-circular module graph.
    forwardRef(() => OffersModule),
  ],
  controllers: [RepairRequestsController],
  providers: [RepairRequestsRepository, RepairRequestsService],
  exports: [RepairRequestsService],
})
export class RepairRequestsModule {}
