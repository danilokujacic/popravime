import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ProviderRepository } from './repositories/provider.repository';
import { ProviderCategoryRepository } from './repositories/provider-category.repository';
import { Provider } from './entities/provider.entity';
import {
  CreateProviderInput,
  ListProvidersFilter,
  UpdateProviderInput,
  UpdateRatingStatsInput,
  UpdateVerificationStatusInput,
  VerificationStatus,
} from './providers.types';
import { IProvidersService } from './providers.service.interface';
import type { IGeocodingService } from '../infra/geocoding/geocoding.service.interface';
import { CitiesService } from '../cities/cities.service';
import { SlugGenerator } from '../../shared/slug/slug.generator';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import { GEOCODING_SERVICE } from '../../common/constants/di-tokens';
import { verificationConfig } from '../../config/verification.config';

@Injectable()
export class ProvidersService implements IProvidersService {
  constructor(
    private readonly providerRepository: ProviderRepository,
    private readonly providerCategoryRepository: ProviderCategoryRepository,
    private readonly citiesService: CitiesService,
    @Inject(GEOCODING_SERVICE)
    private readonly geocodingService: IGeocodingService,
    @Inject(verificationConfig.KEY)
    private readonly verification: ConfigType<typeof verificationConfig>,
    @InjectPinoLogger(ProvidersService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Create(
    ownerUserId: string,
    input: CreateProviderInput,
  ): Promise<Provider> {
    await this.EnsureNoExistingProvider(ownerUserId);

    const city = await this.citiesService.FindById(input.cityId);
    const slug = await SlugGenerator.GenerateUnique(
      input.businessName,
      (candidate) => this.providerRepository.SlugExists(candidate),
    );
    const coordinates = await this.ResolveCreateCoordinates(input, city.name);

    const provider = await this.providerRepository.Create({
      ownerUserId,
      businessName: input.businessName,
      slug,
      description: input.description ?? null,
      address: input.address,
      cityId: input.cityId,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      phone: input.phone ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      workingHours: input.workingHours ?? null,
    });

    await this.providerCategoryRepository.ReplaceForProvider(
      provider.id,
      input.categoryIds,
    );
    await this.citiesService.IncrementProviderCount(input.cityId);

    this.logger.info(
      { providerId: provider.id, ownerUserId, cityId: input.cityId },
      'Provider created',
    );

    return provider;
  }

  async Update(
    id: string,
    ownerUserId: string,
    input: UpdateProviderInput,
  ): Promise<Provider> {
    const provider = await this.FindById(id);
    this.EnsureOwnership(provider, ownerUserId);

    ApplyBasicFields(provider, input);
    ApplyContactFields(provider, input);
    ApplyWorkingHours(provider, input);
    await this.ApplyCoordinates(provider, input);

    const saved = await this.providerRepository.Save(provider);
    this.logger.info({ providerId: id, ownerUserId }, 'Provider updated');

    return saved;
  }

  async Delete(id: string, ownerUserId: string): Promise<void> {
    const provider = await this.FindById(id);
    this.EnsureOwnership(provider, ownerUserId);

    await this.providerRepository.Delete(id);
    await this.citiesService.DecrementProviderCount(provider.cityId);

    this.logger.info({ providerId: id, ownerUserId }, 'Provider deleted');
  }

  async GetForUser(userId: string): Promise<Provider> {
    const provider = await this.providerRepository.FindByOwnerId(userId);
    if (!provider) {
      throw new DomainNotFoundException(
        'PROVIDER_NOT_FOUND',
        'Provider not found',
      );
    }
    return provider;
  }

  async FindById(id: string): Promise<Provider> {
    const provider = await this.providerRepository.FindById(id);
    if (!provider) {
      throw new DomainNotFoundException(
        'PROVIDER_NOT_FOUND',
        'Provider not found',
      );
    }
    return provider;
  }

  async FindBySlug(slug: string): Promise<Provider> {
    const provider = await this.providerRepository.FindBySlug(slug);
    if (!provider) {
      throw new DomainNotFoundException(
        'PROVIDER_NOT_FOUND',
        'Provider not found',
      );
    }
    return provider;
  }

  async List(
    filter: ListProvidersFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Provider>> {
    const result = await this.providerRepository.List(filter, page, limit);
    this.logger.info(
      {
        ...filter,
        page,
        limit,
        total: result.total,
        verificationRequired: this.verification.required,
      },
      'Providers listed',
    );
    return result;
  }

  CountByVerificationStatus(): Promise<Record<VerificationStatus, number>> {
    return this.providerRepository.CountByVerificationStatus();
  }

  async FindCategoryIdsForOwner(ownerUserId: string): Promise<string[]> {
    const categoryIds =
      await this.providerCategoryRepository.ListCategoryIdsForOwner(
        ownerUserId,
      );
    this.logger.info(
      {
        ownerUserId,
        categoryCount: categoryIds.length,
        verificationRequired: this.verification.required,
      },
      'Provider owner serviced categories resolved',
    );
    return categoryIds;
  }

  async UpdateRatingStats(
    providerId: string,
    stats: UpdateRatingStatsInput,
  ): Promise<Provider> {
    const provider = await this.FindById(providerId);
    provider.averageRating = stats.averageRating;
    provider.reviewCount = stats.reviewCount;

    const saved = await this.providerRepository.Save(provider);
    this.logger.info({ providerId, ...stats }, 'Provider rating stats updated');

    return saved;
  }

  async UpdateVerificationStatus(
    providerId: string,
    input: UpdateVerificationStatusInput,
  ): Promise<Provider> {
    const provider = await this.FindById(providerId);
    provider.verificationStatus = input.verificationStatus;
    provider.isCertified = input.isCertified;

    const saved = await this.providerRepository.Save(provider);
    this.logger.info(
      { providerId, ...input },
      'Provider verification status updated',
    );

    return saved;
  }

  private EnsureOwnership(provider: Provider, ownerUserId: string): void {
    if (provider.ownerUserId !== ownerUserId) {
      throw new DomainForbiddenException(
        'PROVIDER_NOT_OWNED',
        'You do not own this provider profile',
      );
    }
  }

  private async EnsureNoExistingProvider(ownerUserId: string): Promise<void> {
    const alreadyExists =
      await this.providerRepository.ExistsForOwner(ownerUserId);
    if (alreadyExists) {
      throw new DomainConflictException(
        'PROVIDER_ALREADY_EXISTS',
        'You already have a provider profile',
      );
    }
  }

  private async ResolveCreateCoordinates(
    input: CreateProviderInput,
    cityName: string,
  ): Promise<{ latitude: string | null; longitude: string | null }> {
    if (HasExplicitCoordinates(input)) {
      return { latitude: input.latitude ?? null, longitude: input.longitude ?? null };
    }
    const geocode = await this.geocodingService.Geocode(
      `${input.address}, ${cityName}, Montenegro`,
    );
    return { latitude: geocode?.latitude ?? null, longitude: geocode?.longitude ?? null };
  }

  private async ApplyCoordinates(
    provider: Provider,
    input: UpdateProviderInput,
  ): Promise<void> {
    if (HasExplicitCoordinates(input)) {
      provider.latitude = input.latitude ?? null;
      provider.longitude = input.longitude ?? null;
      return;
    }
    if (input.address === undefined) {
      return;
    }
    const city = await this.citiesService.FindById(provider.cityId);
    const geocode = await this.geocodingService.Geocode(
      `${input.address}, ${city.name}, Montenegro`,
    );
    provider.latitude = geocode?.latitude ?? null;
    provider.longitude = geocode?.longitude ?? null;
  }
}

function HasExplicitCoordinates(input: {
  latitude?: string;
  longitude?: string;
}): boolean {
  return input.latitude != null && input.longitude != null;
}

function ApplyBasicFields(
  provider: Provider,
  input: UpdateProviderInput,
): void {
  if (input.businessName !== undefined) {
    provider.businessName = input.businessName;
  }
  if (input.description !== undefined) {
    provider.description = input.description;
  }
  if (input.address !== undefined) {
    provider.address = input.address;
  }
}

function ApplyContactFields(
  provider: Provider,
  input: UpdateProviderInput,
): void {
  if (input.phone !== undefined) {
    provider.phone = input.phone;
  }
  if (input.email !== undefined) {
    provider.email = input.email;
  }
  if (input.website !== undefined) {
    provider.website = input.website;
  }
}

function ApplyWorkingHours(
  provider: Provider,
  input: UpdateProviderInput,
): void {
  if (input.workingHours !== undefined) {
    provider.workingHours = input.workingHours;
  }
}
