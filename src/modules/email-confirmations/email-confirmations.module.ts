import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailConfirmation } from './entities/email-confirmation.entity';
import { EmailConfirmationsRepository } from './email-confirmations.repository';
import { EmailConfirmationsService } from './email-confirmations.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmailConfirmation])],
  providers: [EmailConfirmationsRepository, EmailConfirmationsService],
  exports: [EmailConfirmationsService],
})
export class EmailConfirmationsModule {}
