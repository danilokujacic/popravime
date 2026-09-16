import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from './entities/offer.entity';
import { OffersRepository } from './offers.repository';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { ProvidersModule } from '../providers/providers.module';
import { RepairRequestsModule } from '../repair-requests/repair-requests.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offer]),
    ProvidersModule,
    // RepairRequestsModule also imports OffersModule (Reopen() cancels the accepted offer) —
    // forwardRef breaks the otherwise-circular module graph.
    forwardRef(() => RepairRequestsModule),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [OffersController],
  providers: [OffersRepository, OffersService],
  exports: [OffersService],
})
export class OffersModule {}
