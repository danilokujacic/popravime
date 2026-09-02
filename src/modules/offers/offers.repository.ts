import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { ListOffersFilter, OfferStatus } from './offers.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';

@Injectable()
export class OffersRepository {
  constructor(
    @InjectRepository(Offer)
    private readonly repository: Repository<Offer>,
  ) {}

  async List(
    filter: ListOffersFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Offer>> {
    const query = this.repository
      .createQueryBuilder('offer')
      .where('(:requestId::uuid IS NULL OR offer.requestId = :requestId)', {
        requestId: filter.requestId ?? null,
      })
      .andWhere(
        '(:providerId::uuid IS NULL OR offer.providerId = :providerId)',
        {
          providerId: filter.providerId ?? null,
        },
      )
      .andWhere(
        '(:status::text IS NULL OR offer.status = :status::offer_status_enum)',
        {
          status: filter.status ?? null,
        },
      )
      .orderBy('offer.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  FindById(id: string): Promise<Offer | null> {
    return this.repository.findOne({ where: { id } });
  }

  FindOtherPending(
    requestId: string,
    excludeOfferId: string,
  ): Promise<Offer[]> {
    return this.repository.find({
      where: {
        requestId,
        status: OfferStatus.Pending,
        id: Not(excludeOfferId),
      },
    });
  }

  async Create(offer: Partial<Offer>): Promise<Offer> {
    try {
      const entity = this.repository.create(offer);
      return await this.repository.save(entity);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async Save(offer: Offer): Promise<Offer> {
    try {
      return await this.repository.save(offer);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async SaveMany(offers: Offer[]): Promise<Offer[]> {
    try {
      return await this.repository.save(offers);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }
}
