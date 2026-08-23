import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PriceEstimatesRepository } from './price-estimates.repository';
import { PriceEstimate } from './entities/price-estimate.entity';
import {
  CreatePriceEstimateInput,
  ListPriceEstimatesFilter,
  UpdatePriceEstimateInput,
} from './price-estimates.types';
import { IPriceEstimatesService } from './price-estimates.service.interface';
import { CacheService } from '../infra/cache/cache.service';
import { CACHE_KEYS } from '../infra/cache/cache-keys.constants';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';

const PRICE_ESTIMATES_CACHE_TTL_SECONDS = 3600;

function BuildListCacheKey(filter: ListPriceEstimatesFilter): string {
  return `${CACHE_KEYS.PRICE_ESTIMATES_LIST}:${filter.categoryId ?? '*'}`;
}

@Injectable()
export class PriceEstimatesService implements IPriceEstimatesService {
  constructor(
    private readonly priceEstimatesRepository: PriceEstimatesRepository,
    private readonly cacheService: CacheService,
    @InjectPinoLogger(PriceEstimatesService.name)
    private readonly logger: PinoLogger,
  ) {}

  List(filter: ListPriceEstimatesFilter): Promise<PriceEstimate[]> {
    return this.cacheService.GetOrSet(
      BuildListCacheKey(filter),
      () => this.priceEstimatesRepository.List(filter),
      PRICE_ESTIMATES_CACHE_TTL_SECONDS,
    );
  }

  async FindById(id: string): Promise<PriceEstimate> {
    const estimate = await this.priceEstimatesRepository.FindById(id);
    if (!estimate) {
      throw new DomainNotFoundException(
        'PRICE_ESTIMATE_NOT_FOUND',
        'Price estimate not found',
      );
    }
    return estimate;
  }

  async Create(input: CreatePriceEstimateInput): Promise<PriceEstimate> {
    const estimate = await this.priceEstimatesRepository.Create({
      categoryId: input.categoryId,
      serviceType: input.serviceType,
      priceMin: input.priceMin,
      priceMax: input.priceMax,
      currency: input.currency ?? 'EUR',
    });

    await this.InvalidateCache(input.categoryId);
    this.logger.info(
      { priceEstimateId: estimate.id },
      'Price estimate created',
    );

    return estimate;
  }

  async Update(
    id: string,
    input: UpdatePriceEstimateInput,
  ): Promise<PriceEstimate> {
    const estimate = await this.FindById(id);
    ApplyServiceFields(estimate, input);
    ApplyPriceFields(estimate, input);

    const saved = await this.priceEstimatesRepository.Save(estimate);
    await this.InvalidateCache(estimate.categoryId);
    this.logger.info({ priceEstimateId: id }, 'Price estimate updated');

    return saved;
  }

  async Delete(id: string): Promise<void> {
    const estimate = await this.FindById(id);
    await this.priceEstimatesRepository.Delete(id);
    await this.InvalidateCache(estimate.categoryId);
    this.logger.info({ priceEstimateId: id }, 'Price estimate deleted');
  }

  private async InvalidateCache(categoryId: string): Promise<void> {
    await Promise.all([
      this.cacheService.Delete(BuildListCacheKey({ categoryId })),
      this.cacheService.Delete(BuildListCacheKey({})),
    ]);
  }
}

function ApplyServiceFields(
  estimate: PriceEstimate,
  input: UpdatePriceEstimateInput,
): void {
  if (input.serviceType !== undefined) {
    estimate.serviceType = input.serviceType;
  }
  if (input.currency !== undefined) {
    estimate.currency = input.currency;
  }
}

function ApplyPriceFields(
  estimate: PriceEstimate,
  input: UpdatePriceEstimateInput,
): void {
  if (input.priceMin !== undefined) {
    estimate.priceMin = input.priceMin;
  }
  if (input.priceMax !== undefined) {
    estimate.priceMax = input.priceMax;
  }
}
