import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  Validate,
  ValidateNested,
} from 'class-validator';
import { CloseAfterOpenConstraint } from './close-after-open.validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class WorkingHoursRangeDto {
  @IsString()
  @Matches(TIME_PATTERN)
  open: string;

  @IsString()
  @Matches(TIME_PATTERN)
  @Validate(CloseAfterOpenConstraint)
  close: string;
}

export class WorkingHoursDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursRangeDto)
  monday?: WorkingHoursRangeDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursRangeDto)
  tuesday?: WorkingHoursRangeDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursRangeDto)
  wednesday?: WorkingHoursRangeDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursRangeDto)
  thursday?: WorkingHoursRangeDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursRangeDto)
  friday?: WorkingHoursRangeDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursRangeDto)
  saturday?: WorkingHoursRangeDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursRangeDto)
  sunday?: WorkingHoursRangeDto | null;
}
