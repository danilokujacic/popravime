import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { ContactMessagesRepository } from './contact-messages.repository';
import { ContactMessagesService } from './contact-messages.service';
import { ContactMessagesController } from './contact-messages.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TurnstileModule } from '../infra/turnstile/turnstile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactMessage]),
    AuditLogsModule,
    TurnstileModule,
  ],
  controllers: [ContactMessagesController],
  providers: [ContactMessagesRepository, ContactMessagesService],
  exports: [ContactMessagesService],
})
export class ContactMessagesModule {}
