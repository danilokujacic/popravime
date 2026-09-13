import { CitiesService } from './cities.service';
import { CitiesRepository } from './cities.repository';
import { CacheService } from '../infra/cache/cache.service';
import type { IGeocodingService } from '../infra/geocoding/geocoding.service.interface';
import { City } from './entities/city.entity';

function BuildService(overrides?: {
  citiesRepository?: Partial<CitiesRepository>;
  geocodingService?: Partial<IGeocodingService>;
}) {
  const citiesRepository = {
    FindBySlug: jest.fn().mockResolvedValue(null),
    ...overrides?.citiesRepository,
  } as unknown as CitiesRepository;
  const cacheService = {} as unknown as CacheService;
  const geocodingService = {
    ReverseGeocode: jest.fn().mockResolvedValue(null),
    ...overrides?.geocodingService,
  } as unknown as IGeocodingService;
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as ConstructorParameters<typeof CitiesService>[3];

  const service = new CitiesService(
    citiesRepository,
    cacheService,
    geocodingService,
    logger,
  );

  return { service, citiesRepository, geocodingService };
}

function BuildCity(overrides?: Partial<City>): City {
  return {
    id: 'city-1',
    name: 'Nikšić',
    slug: 'niksic',
    isActive: true,
    ...overrides,
  } as City;
}

describe('CitiesService.FindByCoordinates', () => {
  it('returns null when reverse geocoding finds nothing', async () => {
    const { service, citiesRepository } = BuildService();

    const result = await service.FindByCoordinates('42.77', '18.94');

    expect(result).toBeNull();
    expect(citiesRepository.FindBySlug).not.toHaveBeenCalled();
  });

  it('matches the most specific address field first', async () => {
    const niksic = BuildCity();
    const { service, citiesRepository } = BuildService({
      geocodingService: {
        ReverseGeocode: jest.fn().mockResolvedValue({
          city: 'Nikšić',
          town: null,
          village: null,
          municipality: 'Nikšić',
          county: 'Nikšić',
        }),
      },
      citiesRepository: {
        FindBySlug: jest.fn().mockResolvedValue(niksic),
      },
    });

    const result = await service.FindByCoordinates('42.77', '18.94');

    expect(result).toBe(niksic);
    expect(citiesRepository.FindBySlug).toHaveBeenCalledTimes(1);
    expect(citiesRepository.FindBySlug).toHaveBeenCalledWith('niksic');
  });

  it('falls back to a less specific field when the first candidate matches no known city', async () => {
    const podgorica = BuildCity({
      id: 'city-2',
      name: 'Podgorica',
      slug: 'podgorica',
    });
    const findBySlug = jest
      .fn()
      .mockResolvedValueOnce(null) // "city" candidate: some village Nominatim knows, we don't
      .mockResolvedValueOnce(podgorica); // "municipality" candidate matches
    const { service } = BuildService({
      geocodingService: {
        ReverseGeocode: jest.fn().mockResolvedValue({
          city: 'Gornji Kokoti',
          town: null,
          village: null,
          municipality: 'Podgorica',
          county: null,
        }),
      },
      citiesRepository: { FindBySlug: findBySlug },
    });

    const result = await service.FindByCoordinates('42.44', '19.27');

    expect(result).toBe(podgorica);
    expect(findBySlug).toHaveBeenNthCalledWith(1, 'gornji-kokoti');
    expect(findBySlug).toHaveBeenNthCalledWith(2, 'podgorica');
  });

  it('skips an inactive city and keeps trying the remaining candidates', async () => {
    const inactive = BuildCity({ isActive: false });
    const active = BuildCity({ id: 'city-3', name: 'Bar', slug: 'bar' });
    const findBySlug = jest
      .fn()
      .mockResolvedValueOnce(inactive)
      .mockResolvedValueOnce(active);
    const { service } = BuildService({
      geocodingService: {
        ReverseGeocode: jest.fn().mockResolvedValue({
          city: 'Nikšić',
          town: 'Bar',
          village: null,
          municipality: null,
          county: null,
        }),
      },
      citiesRepository: { FindBySlug: findBySlug },
    });

    const result = await service.FindByCoordinates('42.09', '19.09');

    expect(result).toBe(active);
  });

  it('returns null when no candidate matches a known, active city', async () => {
    const { service } = BuildService({
      geocodingService: {
        ReverseGeocode: jest.fn().mockResolvedValue({
          city: null,
          town: null,
          village: 'Somewhere Remote',
          municipality: null,
          county: null,
        }),
      },
    });

    const result = await service.FindByCoordinates('42.00', '19.00');

    expect(result).toBeNull();
  });
});
