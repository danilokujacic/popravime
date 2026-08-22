import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ProviderRepository } from './repositories/provider.repository';
import { ProviderCategoryRepository } from './repositories/provider-category.repository';
import { Provider } from './entities/provider.entity';
import {
  CreateProviderInput,
  ListProvidersFilter,
  UpdateProviderInput,
} from './providers.types';
import { IProvidersService } from './providers.service.interface';
import type { IGeocodingService } from './geocoding/geocoding.service.interface';
import { CitiesService } from '../cities/cities.service';
import { SlugGenerator } from '../../shared/slug/slug.generator';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { GEOCODING_SERVICE } from '../../common/constants/di-tokens';

@Injectable()
export class ProvidersService implements IProvidersService {
  constructor(
    private readonly providerRepository: ProviderRepository,
    private readonly providerCategoryRepository: ProviderCategoryRepository,
    private readonly citiesService: CitiesService,
    @Inject(GEOCODING_SERVICE)
    private readonly geocodingService: IGeocodingService,
    @InjectPinoLogger(ProvidersService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Create(
    ownerUserId: string,
    input: CreateProviderInput,
  ): Promise<Provider> {
    const city = await this.citiesService.FindById(input.cityId);
    const slug = await SlugGenerator.GenerateUnique(
      input.businessName,
      (candidate) => this.providerRepository.SlugExists(candidate),
    );
    const geocode = await this.geocodingService.Geocode(
      `${input.address}, ${city.name}, Montenegro`,
    );

    const provider = await this.providerRepository.Create({
      ownerUserId,
      businessName: input.businessName,
      slug,
      description: input.description ?? null,
      address: input.address,
      cityId: input.cityId,
      latitude: geocode?.latitude ?? null,
      longitude: geocode?.longitude ?? null,
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

    if (input.address !== undefined) {
      const city = await this.citiesService.FindById(provider.cityId);
      const geocode = await this.geocodingService.Geocode(
        `${input.address}, ${city.name}, Montenegro`,
      );
      provider.latitude = geocode?.latitude ?? null;
      provider.longitude = geocode?.longitude ?? null;
    }

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

  List(
    filter: ListProvidersFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Provider>> {
    return this.providerRepository.List(filter, page, limit);
  }

  private EnsureOwnership(provider: Provider, ownerUserId: string): void {
    if (provider.ownerUserId !== ownerUserId) {
      throw new DomainForbiddenException(
        'PROVIDER_NOT_OWNED',
        'You do not own this provider profile',
      );
    }
  }
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
