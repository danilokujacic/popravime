import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { DirectInquiry } from './entities/direct-inquiry.entity';
import { DirectInquiriesRepository } from './direct-inquiries.repository';
import { DirectInquiriesService } from './direct-inquiries.service';
import { DirectInquiriesController } from './direct-inquiries.controller';
import { ProvidersModule } from '../providers/providers.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TurnstileModule } from '../infra/turnstile/turnstile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DirectInquiry]),
    JwtModule.register({}),
    ProvidersModule,
    UsersModule,
    NotificationsModule,
    TurnstileModule,
  ],
  controllers: [DirectInquiriesController],
  providers: [DirectInquiriesRepository, DirectInquiriesService],
  exports: [DirectInquiriesService],
})
export class DirectInquiriesModule {}
