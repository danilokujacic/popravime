import { Provider } from '../../providers/entities/provider.entity';
import { AdminProviderResponseDto } from '../dto/admin-provider-response.dto';

export class AdminProviderResponseMapper {
  static ToDto(this: void, provider: Provider): AdminProviderResponseDto {
    const dto = new AdminProviderResponseDto();
    dto.id = provider.id;
    dto.businessName = provider.businessName;
    dto.slug = provider.slug;
    dto.address = provider.address;
    dto.cityId = provider.cityId;
    dto.phone = provider.phone;
    dto.email = provider.email;
    dto.website = provider.website;
    dto.approved = provider.approved;
    dto.verificationStatus = provider.verificationStatus;
    dto.createdAt = provider.createdAt;
    dto.ownerFullName = provider.ownerUser.fullName;
    dto.ownerEmail = provider.ownerUser.email;
    dto.ownerPhone = provider.ownerUser.phone;
    return dto;
  }
}
