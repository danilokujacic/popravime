import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { FaqItemsRepository } from './faq-items.repository';
import { FaqItem } from './entities/faq-item.entity';
import { CreateFaqItemInput, UpdateFaqItemInput } from './faq-items.types';
import { IFaqItemsService } from './faq-items.service.interface';
import { CacheService } from '../infra/cache/cache.service';
import { CACHE_KEYS } from '../infra/cache/cache-keys.constants';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';

const FAQ_CACHE_TTL_SECONDS = 3600;

@Injectable()
export class FaqItemsService implements IFaqItemsService {
  constructor(
    private readonly faqItemsRepository: FaqItemsRepository,
    private readonly cacheService: CacheService,
    @InjectPinoLogger(FaqItemsService.name)
    private readonly logger: PinoLogger,
  ) {}

  List(): Promise<FaqItem[]> {
    return this.cacheService.GetOrSet(
      CACHE_KEYS.FAQ_LIST,
      () => this.faqItemsRepository.List(),
      FAQ_CACHE_TTL_SECONDS,
    );
  }

  async FindById(id: string): Promise<FaqItem> {
    const item = await this.faqItemsRepository.FindById(id);
    if (!item) {
      throw new DomainNotFoundException(
        'FAQ_ITEM_NOT_FOUND',
        'FAQ item not found',
      );
    }
    return item;
  }

  async Create(input: CreateFaqItemInput): Promise<FaqItem> {
    const item = await this.faqItemsRepository.Create({
      question: input.question,
      answer: input.answer,
      category: input.category,
      sortOrder: input.sortOrder ?? 0,
    });

    await this.InvalidateCache();
    this.logger.info({ faqItemId: item.id }, 'FAQ item created');

    return item;
  }

  async Update(id: string, input: UpdateFaqItemInput): Promise<FaqItem> {
    const item = await this.FindById(id);
    ApplyTextFields(item, input);
    ApplySortOrder(item, input);

    const saved = await this.faqItemsRepository.Save(item);
    await this.InvalidateCache();
    this.logger.info({ faqItemId: id }, 'FAQ item updated');

    return saved;
  }

  async Delete(id: string): Promise<void> {
    await this.FindById(id);
    await this.faqItemsRepository.Delete(id);
    await this.InvalidateCache();
    this.logger.info({ faqItemId: id }, 'FAQ item deleted');
  }

  private async InvalidateCache(): Promise<void> {
    await this.cacheService.Delete(CACHE_KEYS.FAQ_LIST);
  }
}

function ApplyTextFields(item: FaqItem, input: UpdateFaqItemInput): void {
  if (input.question !== undefined) {
    item.question = input.question;
  }
  if (input.answer !== undefined) {
    item.answer = input.answer;
  }
  if (input.category !== undefined) {
    item.category = input.category;
  }
}

function ApplySortOrder(item: FaqItem, input: UpdateFaqItemInput): void {
  if (input.sortOrder !== undefined) {
    item.sortOrder = input.sortOrder;
  }
}
