import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { MessagesRepository } from './messages.repository';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { RepairRequestsModule } from '../repair-requests/repair-requests.module';
import { OffersModule } from '../offers/offers.module';
import { DirectInquiriesModule } from '../direct-inquiries/direct-inquiries.module';
import { ProvidersModule } from '../providers/providers.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../infra/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    RepairRequestsModule,
    OffersModule,
    DirectInquiriesModule,
    ProvidersModule,
    UsersModule,
    NotificationsModule,
    StorageModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesRepository, MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
