import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaqItem } from './entities/faq-item.entity';
import { FaqItemsRepository } from './faq-items.repository';
import { FaqItemsService } from './faq-items.service';
import { FaqItemsController } from './faq-items.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([FaqItem]), AuditLogsModule],
  controllers: [FaqItemsController],
  providers: [FaqItemsRepository, FaqItemsService],
  exports: [FaqItemsService],
})
export class FaqItemsModule {}
