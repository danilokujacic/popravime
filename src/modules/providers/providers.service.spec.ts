import { ProvidersService } from './providers.service';
import { ProviderRepository } from './repositories/provider.repository';
import { ProviderCategoryRepository } from './repositories/provider-category.repository';
import { CitiesService } from '../cities/cities.service';
import type { IGeocodingService } from '../infra/geocoding/geocoding.service.interface';
import { Provider } from './entities/provider.entity';
import { City } from '../cities/entities/city.entity';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { VerificationStatus } from './providers.types';

function BuildService(categoryIds: string[]) {
  const providerRepository = {} as unknown as ProviderRepository;
  const providerCategoryRepository = {
    ListCategoryIdsForOwner: jest.fn().mockResolvedValue(categoryIds),
  } as unknown as ProviderCategoryRepository;
  const citiesService = {} as unknown as CitiesService;
  const geocodingService = {} as unknown as IGeocodingService;
  const verification = {
    required: true,
  } as unknown as ConstructorParameters<typeof ProvidersService>[4];
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as ConstructorParameters<typeof ProvidersService>[5];

  const service = new ProvidersService(
    providerRepository,
    providerCategoryRepository,
    citiesService,
    geocodingService,
    verification,
    logger,
  );

  return { service, providerCategoryRepository };
}

describe('ProvidersService.FindCategoryIdsForOwner', () => {
  it('returns the category ids serviced by the owner’s provider profiles', async () => {
    const { service, providerCategoryRepository } = BuildService([
      'category-plumbing',
      'category-electrics',
    ]);

    const result = await service.FindCategoryIdsForOwner('provider-owner-1');

    expect(result).toEqual(['category-plumbing', 'category-electrics']);
    expect(
      providerCategoryRepository.ListCategoryIdsForOwner,
    ).toHaveBeenCalledWith('provider-owner-1');
  });

  it('returns an empty list when the owner services no categories yet', async () => {
    const { service } = BuildService([]);

    const result = await service.FindCategoryIdsForOwner('provider-owner-1');

    expect(result).toEqual([]);
  });
});

function BuildCity(overrides?: Partial<City>): City {
  return { id: 'city-1', name: 'Podgorica', ...overrides } as City;
}

describe('ProvidersService.Create', () => {
  function BuildService() {
    const providerRepository = {
      ExistsForOwner: jest.fn().mockResolvedValue(false),
      SlugExists: jest.fn().mockResolvedValue(false),
      Create: jest
        .fn()
        .mockImplementation((value) =>
          Promise.resolve({ id: 'provider-1', ...value }),
        ),
    } as unknown as ProviderRepository;
    const providerCategoryRepository = {
      ReplaceForProvider: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProviderCategoryRepository;
    const citiesService = {
      FindById: jest.fn().mockResolvedValue(BuildCity()),
      IncrementProviderCount: jest.fn().mockResolvedValue(undefined),
    } as unknown as CitiesService;
    const geocodingService = {
      Geocode: jest.fn(),
    } as unknown as IGeocodingService;
    const verification = {
      required: true,
    } as unknown as ConstructorParameters<typeof ProvidersService>[4];
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof ProvidersService>[5];

    const service = new ProvidersService(
      providerRepository,
      providerCategoryRepository,
      citiesService,
      geocodingService,
      verification,
      logger,
    );

    return { service, providerRepository, geocodingService };
  }

  it('stores caller-supplied coordinates verbatim and skips geocoding', async () => {
    const { service, providerRepository, geocodingService } = BuildService();

    const provider = await service.Create('owner-1', {
      businessName: 'Ana Repair',
      address: 'Bulevar Svetog Petra Cetinjskog 1',
      cityId: 'city-1',
      latitude: '42.430400',
      longitude: '19.259400',
      categoryIds: ['category-1'],
    });

    expect(provider.latitude).toBe('42.430400');
    expect(provider.longitude).toBe('19.259400');
    expect(geocodingService.Geocode).not.toHaveBeenCalled();
    expect(providerRepository.Create).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: '42.430400',
        longitude: '19.259400',
      }),
    );
  });

  it('falls back to geocoding the address when no coordinates are supplied', async () => {
    const { service, providerRepository, geocodingService } = BuildService();
    (geocodingService.Geocode as jest.Mock).mockResolvedValue({
      latitude: '42.430400',
      longitude: '19.259400',
    });

    const provider = await service.Create('owner-1', {
      businessName: 'Ana Repair',
      address: 'Bulevar Svetog Petra Cetinjskog 1',
      cityId: 'city-1',
      categoryIds: ['category-1'],
    });

    expect(geocodingService.Geocode).toHaveBeenCalledWith(
      'Bulevar Svetog Petra Cetinjskog 1, Podgorica, Montenegro',
    );
    expect(provider.latitude).toBe('42.430400');
    expect(provider.longitude).toBe('19.259400');
    expect(providerRepository.Create).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: '42.430400',
        longitude: '19.259400',
      }),
    );
  });

  it('rejects creating a second provider for an owner who already has one', async () => {
    const { service, providerRepository } = BuildService();
    (providerRepository.ExistsForOwner as jest.Mock).mockResolvedValue(true);

    await expect(
      service.Create('owner-1', {
        businessName: 'Ana Repair',
        address: 'Bulevar Svetog Petra Cetinjskog 1',
        cityId: 'city-1',
        categoryIds: ['category-1'],
      }),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(providerRepository.Create).not.toHaveBeenCalled();
  });
});

function BuildExistingProvider(overrides?: Partial<Provider>): Provider {
  return {
    id: 'provider-1',
    ownerUserId: 'owner-1',
    businessName: 'Ana Repair',
    slug: 'ana-repair',
    address: 'Old address 1',
    cityId: 'city-1',
    latitude: '10.000000',
    longitude: '20.000000',
    ...overrides,
  } as Provider;
}

describe('ProvidersService.Update', () => {
  function BuildService(provider: Provider) {
    const providerRepository = {
      FindById: jest.fn().mockResolvedValue(provider),
      Save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    } as unknown as ProviderRepository;
    const providerCategoryRepository =
      {} as unknown as ProviderCategoryRepository;
    const citiesService = {
      FindById: jest.fn().mockResolvedValue(BuildCity()),
    } as unknown as CitiesService;
    const geocodingService = {
      Geocode: jest.fn(),
    } as unknown as IGeocodingService;
    const verification = {
      required: true,
    } as unknown as ConstructorParameters<typeof ProvidersService>[4];
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof ProvidersService>[5];

    const service = new ProvidersService(
      providerRepository,
      providerCategoryRepository,
      citiesService,
      geocodingService,
      verification,
      logger,
    );

    return { service, citiesService, geocodingService };
  }

  it('updates only the coordinates, leaving the address and geocoding untouched', async () => {
    const provider = BuildExistingProvider();
    const { service, citiesService, geocodingService } = BuildService(provider);

    const saved = await service.Update('provider-1', 'owner-1', {
      latitude: '11.000000',
      longitude: '21.000000',
    });

    expect(saved.latitude).toBe('11.000000');
    expect(saved.longitude).toBe('21.000000');
    expect(saved.address).toBe('Old address 1');
    expect(citiesService.FindById).not.toHaveBeenCalled();
    expect(geocodingService.Geocode).not.toHaveBeenCalled();
  });

  it('stores explicit coordinates and skips geocoding even when the address also changes', async () => {
    const provider = BuildExistingProvider();
    const { service, citiesService, geocodingService } = BuildService(provider);

    const saved = await service.Update('provider-1', 'owner-1', {
      address: 'New address 2',
      latitude: '11.000000',
      longitude: '21.000000',
    });

    expect(saved.address).toBe('New address 2');
    expect(saved.latitude).toBe('11.000000');
    expect(saved.longitude).toBe('21.000000');
    expect(citiesService.FindById).not.toHaveBeenCalled();
    expect(geocodingService.Geocode).not.toHaveBeenCalled();
  });

  it('falls back to geocoding the new address when no coordinates are supplied', async () => {
    const provider = BuildExistingProvider();
    const { service, citiesService, geocodingService } = BuildService(provider);
    (geocodingService.Geocode as jest.Mock).mockResolvedValue({
      latitude: '33.000000',
      longitude: '44.000000',
    });

    const saved = await service.Update('provider-1', 'owner-1', {
      address: 'New address 2',
    });

    expect(citiesService.FindById).toHaveBeenCalledWith('city-1');
    expect(geocodingService.Geocode).toHaveBeenCalledWith(
      'New address 2, Podgorica, Montenegro',
    );
    expect(saved.latitude).toBe('33.000000');
    expect(saved.longitude).toBe('44.000000');
  });

  it('leaves coordinates untouched when neither address nor coordinates are supplied', async () => {
    const provider = BuildExistingProvider();
    const { service, citiesService, geocodingService } = BuildService(provider);

    const saved = await service.Update('provider-1', 'owner-1', {
      businessName: 'Renamed Repair',
    });

    expect(saved.latitude).toBe('10.000000');
    expect(saved.longitude).toBe('20.000000');
    expect(citiesService.FindById).not.toHaveBeenCalled();
    expect(geocodingService.Geocode).not.toHaveBeenCalled();
  });
});

function BuildPublicProvider(overrides?: Partial<Provider>): Provider {
  return {
    id: 'provider-1',
    slug: 'ana-repair',
    approved: true,
    verificationStatus: VerificationStatus.Verified,
    ...overrides,
  } as Provider;
}

describe('ProvidersService.FindPublicById / FindPublicBySlug', () => {
  function BuildService(provider: Provider, verificationRequired = true) {
    const providerRepository = {
      FindById: jest.fn().mockResolvedValue(provider),
      FindBySlug: jest.fn().mockResolvedValue(provider),
    } as unknown as ProviderRepository;
    const providerCategoryRepository =
      {} as unknown as ProviderCategoryRepository;
    const citiesService = {} as unknown as CitiesService;
    const geocodingService = {} as unknown as IGeocodingService;
    const verification = {
      required: verificationRequired,
    } as unknown as ConstructorParameters<typeof ProvidersService>[4];
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof ProvidersService>[5];

    const service = new ProvidersService(
      providerRepository,
      providerCategoryRepository,
      citiesService,
      geocodingService,
      verification,
      logger,
    );

    return { service };
  }

  it('returns a verified provider by id', async () => {
    const { service } = BuildService(BuildPublicProvider());

    const result = await service.FindPublicById('provider-1');

    expect(result.id).toBe('provider-1');
  });

  it('hides a rejected provider behind a 404, even by direct id', async () => {
    const { service } = BuildService(
      BuildPublicProvider({ verificationStatus: VerificationStatus.Rejected }),
    );

    await expect(service.FindPublicById('provider-1')).rejects.toBeInstanceOf(
      DomainNotFoundException,
    );
  });

  it('hides an unapproved provider behind a 404, even a verified one', async () => {
    const { service } = BuildService(
      BuildPublicProvider({
        approved: false,
        verificationStatus: VerificationStatus.Verified,
      }),
    );

    await expect(service.FindPublicById('provider-1')).rejects.toBeInstanceOf(
      DomainNotFoundException,
    );
    await expect(service.FindPublicBySlug('ana-repair')).rejects.toBeInstanceOf(
      DomainNotFoundException,
    );
  });

  it('hides a rejected provider behind a 404 by slug too', async () => {
    const { service } = BuildService(
      BuildPublicProvider({ verificationStatus: VerificationStatus.Rejected }),
    );

    await expect(service.FindPublicBySlug('ana-repair')).rejects.toBeInstanceOf(
      DomainNotFoundException,
    );
  });

  it('hides a pending provider when verification is required', async () => {
    const { service } = BuildService(
      BuildPublicProvider({ verificationStatus: VerificationStatus.Pending }),
      true,
    );

    await expect(service.FindPublicById('provider-1')).rejects.toBeInstanceOf(
      DomainNotFoundException,
    );
  });

  it('allows a pending provider when verification is not required', async () => {
    const { service } = BuildService(
      BuildPublicProvider({ verificationStatus: VerificationStatus.Pending }),
      false,
    );

    const result = await service.FindPublicById('provider-1');

    expect(result.id).toBe('provider-1');
  });
});

describe('ProvidersService.SetApproved', () => {
  function BuildService(existing: Provider | null) {
    const approvedWithOwner = {
      ...BuildExistingProvider({ approved: true }),
      ownerUser: { id: 'owner-1', fullName: 'Ana Owner' },
    } as Provider;
    const providerRepository = {
      FindById: jest.fn().mockResolvedValue(existing),
      SetApproved: jest.fn().mockResolvedValue(undefined),
      FindByIdWithOwner: jest.fn().mockResolvedValue(approvedWithOwner),
    } as unknown as ProviderRepository;
    const providerCategoryRepository =
      {} as unknown as ProviderCategoryRepository;
    const verification = {
      required: true,
    } as unknown as ConstructorParameters<typeof ProvidersService>[4];
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof ProvidersService>[5];

    const service = new ProvidersService(
      providerRepository,
      providerCategoryRepository,
      {} as unknown as CitiesService,
      {} as unknown as IGeocodingService,
      verification,
      logger,
    );

    return { service, providerRepository };
  }

  it('returns the provider with its owner loaded, read after the update', async () => {
    const { service, providerRepository } = BuildService(
      BuildExistingProvider(),
    );

    const provider = await service.SetApproved('provider-1', true);

    expect(provider.ownerUser.fullName).toBe('Ana Owner');
    expect(providerRepository.SetApproved).toHaveBeenCalledWith(
      'provider-1',
      true,
    );
    expect(
      (providerRepository.SetApproved as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan(
      (providerRepository.FindByIdWithOwner as jest.Mock).mock
        .invocationCallOrder[0],
    );
  });

  it('rejects an unknown provider without changing anything', async () => {
    const { service, providerRepository } = BuildService(null);

    await expect(service.SetApproved('missing', true)).rejects.toBeInstanceOf(
      DomainNotFoundException,
    );
    expect(providerRepository.SetApproved).not.toHaveBeenCalled();
  });
});
