import { Expose } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMessageDto {
  @IsOptional()
  @IsUUID()
  @Expose({ name: 'request_id' })
  requestId?: string;

  @IsOptional()
  @IsUUID()
  @Expose({ name: 'inquiry_id' })
  inquiryId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;
}
