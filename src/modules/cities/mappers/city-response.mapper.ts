import { City } from '../entities/city.entity';
import { CityResponseDto } from '../dto/city-response.dto';

export class CityResponseMapper {
  static ToDto(city: City): CityResponseDto {
    const dto = new CityResponseDto();
    dto.id = city.id;
    dto.name = city.name;
    dto.slug = city.slug;
    dto.region = city.region;
    dto.isActive = city.isActive;
    dto.providerCount = city.providerCount;
    return dto;
  }
}
