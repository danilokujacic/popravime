import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from './entities/offer.entity';
import { OffersRepository } from './offers.repository';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { ProvidersModule } from '../providers/providers.module';
import { RepairRequestsModule } from '../repair-requests/repair-requests.module';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../infra/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offer]),
    ProvidersModule,
    RepairRequestsModule,
    UsersModule,
    EmailModule,
  ],
  controllers: [OffersController],
  providers: [OffersRepository, OffersService],
  exports: [OffersService],
})
export class OffersModule {}
