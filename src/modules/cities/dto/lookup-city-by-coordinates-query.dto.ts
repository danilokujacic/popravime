import { IsLatitude, IsLongitude } from 'class-validator';

export class LookupCityByCoordinatesQueryDto {
  @IsLatitude()
  latitude: string;

  @IsLongitude()
  longitude: string;
}
