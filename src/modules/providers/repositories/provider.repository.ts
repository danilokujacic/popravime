import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ConfigType } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Provider } from '../entities/provider.entity';
import {
  EligibleStatuses,
  ListProvidersForAdminFilter,
  ListProvidersFilter,
  VerificationStatus,
} from '../providers.types';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../../database/persistence-error.mapper';
import { verificationConfig } from '../../../config/verification.config';

const CATEGORY_EXISTS_CLAUSE = `(:categoryId::uuid IS NULL OR EXISTS (
  SELECT 1 FROM provider_categories pc
  WHERE pc.provider_id = provider.id AND pc.category_id = :categoryId
))`;

@Injectable()
export class ProviderRepository {
  constructor(
    @InjectRepository(Provider)
    private readonly repository: Repository<Provider>,
    @Inject(verificationConfig.KEY)
    private readonly config: ConfigType<typeof verificationConfig>,
  ) {}

  async List(
    filter: ListProvidersFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Provider>> {
    const query = this.repository
      .createQueryBuilder('provider')
      .where('(:cityId::uuid IS NULL OR provider.cityId = :cityId)', {
        cityId: filter.cityId ?? null,
      })
      .andWhere(CATEGORY_EXISTS_CLAUSE, {
        categoryId: filter.categoryId ?? null,
      })
      .andWhere(
        '(:search::text IS NULL OR provider.businessName ILIKE :search)',
        {
          search: filter.search ? `%${filter.search}%` : null,
        },
      )
      .andWhere('provider.approved = true')
      .andWhere('provider.verificationStatus = ANY(:eligibleStatuses)', {
        eligibleStatuses: EligibleStatuses(this.config.required),
      })
      .orderBy('provider.businessName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  async ListForAdmin(
    filter: ListProvidersForAdminFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Provider>> {
    const [items, total] = await this.repository
      .createQueryBuilder('provider')
      .innerJoinAndSelect('provider.ownerUser', 'ownerUser')
      .where('(:approved::boolean IS NULL OR provider.approved = :approved)', {
        approved: filter.approved ?? null,
      })
      .orderBy('provider.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  async SetApproved(id: string, approved: boolean): Promise<void> {
    await this.repository.update({ id }, { approved });
  }

  FindById(id: string): Promise<Provider | null> {
    return this.repository.findOne({ where: { id } });
  }

  // For notifying providers of a new repair request in their category — owner is loaded so the
  // caller has an email/name to send to without a separate round trip per provider.
  ListEligibleForCategory(categoryId: string): Promise<Provider[]> {
    return this.repository
      .createQueryBuilder('provider')
      .innerJoinAndSelect('provider.ownerUser', 'ownerUser')
      .where(CATEGORY_EXISTS_CLAUSE, { categoryId })
      .andWhere('provider.approved = true')
      .andWhere('provider.verificationStatus = ANY(:eligibleStatuses)', {
        eligibleStatuses: EligibleStatuses(this.config.required),
      })
      .getMany();
  }

  FindBySlug(slug: string): Promise<Provider | null> {
    return this.repository.findOne({ where: { slug } });
  }

  FindByOwnerId(ownerUserId: string): Promise<Provider | null> {
    return this.repository.findOne({ where: { ownerUserId } });
  }

  async SlugExists(slug: string): Promise<boolean> {
    const count = await this.repository.count({ where: { slug } });
    return count > 0;
  }

  async ExistsForOwner(ownerUserId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { ownerUserId } });
    return count > 0;
  }

  async Create(provider: Partial<Provider>): Promise<Provider> {
    try {
      const entity = this.repository.create(provider);
      return await this.repository.save(entity);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async Save(provider: Provider): Promise<Provider> {
    try {
      return await this.repository.save(provider);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async Delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async CountByVerificationStatus(): Promise<
    Record<VerificationStatus, number>
  > {
    const [pending, verified, rejected] = await Promise.all([
      this.repository.count({
        where: { verificationStatus: VerificationStatus.Pending },
      }),
      this.repository.count({
        where: { verificationStatus: VerificationStatus.Verified },
      }),
      this.repository.count({
        where: { verificationStatus: VerificationStatus.Rejected },
      }),
    ]);

    return {
      [VerificationStatus.Pending]: pending,
      [VerificationStatus.Verified]: verified,
      [VerificationStatus.Rejected]: rejected,
    };
  }
}
