import { Processor, WorkerHost } from '@nestjs/bullmq';
import { RetentionService } from './retention.service';
import { RETENTION_QUEUE_NAME } from '../../common/constants/di-tokens';

@Processor(RETENTION_QUEUE_NAME)
export class RetentionProcessor extends WorkerHost {
  constructor(private readonly retentionService: RetentionService) {
    super();
  }

  async process(): Promise<void> {
    await this.retentionService.Purge();
  }
}
