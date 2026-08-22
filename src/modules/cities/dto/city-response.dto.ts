export class CityResponseDto {
  id: string;
  name: string;
  slug: string;
  region: string | null;
  isActive: boolean;
  providerCount: number;
}
