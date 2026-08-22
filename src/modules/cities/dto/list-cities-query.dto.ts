import { Expose, Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

function ToBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class ListCitiesQueryDto {
  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @Transform(ToBoolean)
  @IsBoolean()
  @Expose({ name: 'is_active' })
  isActive?: boolean;
}
