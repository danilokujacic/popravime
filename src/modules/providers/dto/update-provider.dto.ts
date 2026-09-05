import { Expose, Type } from 'class-transformer';
import {
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  Validate,
  ValidateNested,
} from 'class-validator';
import { WorkingHoursDto } from './working-hours.dto';
import { PairedCoordinatesConstraint } from './paired-coordinates.validator';

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Expose({ name: 'business_name' })
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsLatitude()
  @Validate(PairedCoordinatesConstraint)
  latitude?: string;

  @IsOptional()
  @IsLongitude()
  @Validate(PairedCoordinatesConstraint)
  longitude?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  @Expose({ name: 'working_hours' })
  workingHours?: WorkingHoursDto;
}
