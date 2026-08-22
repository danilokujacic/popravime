import { ProviderGallery } from '../entities/provider-gallery.entity';
import { ProviderGalleryResponseDto } from '../dto/provider-gallery-response.dto';

export class ProviderGalleryResponseMapper {
  static ToDto(image: ProviderGallery): ProviderGalleryResponseDto {
    const dto = new ProviderGalleryResponseDto();
    dto.id = image.id;
    dto.providerId = image.providerId;
    dto.imageUrl = image.imageUrl;
    dto.caption = image.caption;
    dto.sortOrder = image.sortOrder;
    return dto;
  }
}
