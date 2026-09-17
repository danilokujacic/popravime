import { Provider } from '../entities/provider.entity';
import { ProviderResponseDto } from '../dto/provider-response.dto';
import { ProviderOwnerResponseDto } from '../dto/provider-owner-response.dto';

export class ProviderResponseMapper {
  static ToDto(this: void, provider: Provider): ProviderResponseDto {
    const dto = new ProviderResponseDto();
    dto.id = provider.id;
    dto.ownerUserId = provider.ownerUserId;
    dto.businessName = provider.businessName;
    dto.slug = provider.slug;
    dto.description = provider.description;
    dto.address = provider.address;
    dto.cityId = provider.cityId;
    dto.latitude = provider.latitude;
    dto.longitude = provider.longitude;
    dto.website = provider.website;
    dto.workingHours = provider.workingHours;
    dto.verificationStatus = provider.verificationStatus;
    dto.isCertified = provider.isCertified;
    dto.averageRating = provider.averageRating;
    dto.reviewCount = provider.reviewCount;
    dto.createdAt = provider.createdAt;
    return dto;
  }

  static ToOwnerDto(this: void, provider: Provider): ProviderOwnerResponseDto {
    const dto = new ProviderOwnerResponseDto();
    Object.assign(dto, ProviderResponseMapper.ToDto(provider));
    dto.phone = provider.phone;
    dto.email = provider.email;
    return dto;
  }
}
