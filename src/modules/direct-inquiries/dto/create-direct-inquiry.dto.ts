import { Expose } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TurnstileProtectedDto } from '../../infra/turnstile/dto/turnstile-protected.dto';

export class CreateDirectInquiryDto extends TurnstileProtectedDto {
  @IsUUID()
  @Expose({ name: 'provider_id' })
  providerId: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  @Expose({ name: 'contact_email' })
  contactEmail?: string;

  @IsOptional()
  @IsPhoneNumber()
  @Expose({ name: 'contact_phone' })
  contactPhone?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  message: string;
}
