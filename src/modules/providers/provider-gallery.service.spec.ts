import { ProviderGalleryService } from './provider-gallery.service';
import { ProviderGalleryRepository } from './repositories/provider-gallery.repository';
import { ProvidersService } from './providers.service';
import { Provider } from './entities/provider.entity';
import { ProviderGallery } from './entities/provider-gallery.entity';
import type { StorageService } from '../infra/storage/storage.service.interface';

function BuildProvider(overrides?: Partial<Provider>): Provider {
  return { id: 'provider-1', ownerUserId: 'owner-1', ...overrides } as Provider;
}

function BuildImage(overrides?: Partial<ProviderGallery>): ProviderGallery {
  return {
    id: 'image-1',
    providerId: 'provider-1',
    imageUrl: 'http://localhost:9000/popravime-dev/some-key.png',
    storageKey: 'some-key.png',
    ...overrides,
  } as ProviderGallery;
}

describe('ProviderGalleryService.Delete', () => {
  function BuildService(image: ProviderGallery) {
    const providerGalleryRepository = {
      FindById: jest.fn().mockResolvedValue(image),
      Delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProviderGalleryRepository;

    const providersService = {
      FindById: jest.fn().mockResolvedValue(BuildProvider()),
    } as unknown as ProvidersService;

    const storageService = {
      Delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as StorageService;

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof ProviderGalleryService>[3];

    const service = new ProviderGalleryService(
      providerGalleryRepository,
      providersService,
      storageService,
      logger,
    );

    return { service, storageService };
  }

  it('deletes using the stored storage key, not a derived one', async () => {
    const image = BuildImage({
      storageKey: 'the-real-stored-key.png',
      imageUrl: 'http://localhost:9000/popravime-dev/a-different-name.png',
    });
    const { service, storageService } = BuildService(image);

    await service.Delete('provider-1', 'image-1', 'owner-1');

    expect(storageService.Delete).toHaveBeenCalledWith(
      'the-real-stored-key.png',
    );
  });
});
