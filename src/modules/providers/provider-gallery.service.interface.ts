import { ProviderGallery } from './entities/provider-gallery.entity';
import { AddGalleryImageInput } from './providers.types';

export interface IProviderGalleryService {
  List(providerId: string): Promise<ProviderGallery[]>;
  Add(
    providerId: string,
    ownerUserId: string,
    input: AddGalleryImageInput,
  ): Promise<ProviderGallery>;
  Delete(
    providerId: string,
    imageId: string,
    ownerUserId: string,
  ): Promise<void>;
}
