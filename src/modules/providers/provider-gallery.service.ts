import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ProviderGalleryRepository } from './repositories/provider-gallery.repository';
import { ProvidersService } from './providers.service';
import { ProviderGallery } from './entities/provider-gallery.entity';
import { AddGalleryImageInput } from './providers.types';
import { IProviderGalleryService } from './provider-gallery.service.interface';
import type { StorageService } from '../infra/storage/storage.service.interface';
import { STORAGE_SERVICE } from '../../common/constants/di-tokens';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';

@Injectable()
export class ProviderGalleryService implements IProviderGalleryService {
  constructor(
    private readonly providerGalleryRepository: ProviderGalleryRepository,
    private readonly providersService: ProvidersService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    @InjectPinoLogger(ProviderGalleryService.name)
    private readonly logger: PinoLogger,
  ) {}

  List(providerId: string): Promise<ProviderGallery[]> {
    return this.providerGalleryRepository.List(providerId);
  }

  async Add(
    providerId: string,
    ownerUserId: string,
    input: AddGalleryImageInput,
  ): Promise<ProviderGallery> {
    const provider = await this.providersService.FindById(providerId);
    this.EnsureOwnership(provider.ownerUserId, ownerUserId);

    const uploaded = await this.storageService.Upload({
      buffer: input.buffer,
      fileName: input.fileName,
      contentType: input.contentType,
    });

    const image = await this.providerGalleryRepository.Add({
      providerId,
      imageUrl: uploaded.url,
      storageKey: uploaded.key,
      caption: input.caption ?? null,
    });

    this.logger.info({ providerId, imageId: image.id }, 'Gallery image added');

    return image;
  }

  async Delete(
    providerId: string,
    imageId: string,
    ownerUserId: string,
  ): Promise<void> {
    const provider = await this.providersService.FindById(providerId);
    this.EnsureOwnership(provider.ownerUserId, ownerUserId);

    const image = await this.providerGalleryRepository.FindById(imageId);
    if (!image || image.providerId !== providerId) {
      throw new DomainNotFoundException(
        'GALLERY_IMAGE_NOT_FOUND',
        'Gallery image not found',
      );
    }

    await this.storageService.Delete(image.storageKey);
    await this.providerGalleryRepository.Delete(imageId);

    this.logger.info({ providerId, imageId }, 'Gallery image deleted');
  }

  private EnsureOwnership(providerOwnerId: string, ownerUserId: string): void {
    if (providerOwnerId !== ownerUserId) {
      throw new DomainForbiddenException(
        'PROVIDER_NOT_OWNED',
        'You do not own this provider profile',
      );
    }
  }
}
