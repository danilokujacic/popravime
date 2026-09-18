import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminAnalyticsService } from './analytics/admin-analytics.service';
import { ProvidersModule } from '../providers/providers.module';
import { RepairRequestsModule } from '../repair-requests/repair-requests.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { CitiesModule } from '../cities/cities.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AdminProvidersService } from './providers/admin-providers.service';

@Module({
  imports: [
    ProvidersModule,
    RepairRequestsModule,
    ReviewsModule,
    CitiesModule,
    AuditLogsModule,
  ],
  controllers: [AdminController],
  providers: [AdminAnalyticsService, AdminProvidersService],
})
export class AdminModule {}
