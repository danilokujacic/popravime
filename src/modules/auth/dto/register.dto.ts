import { Expose } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MatchesField } from '../../../common/validators/matches-field.decorator';
import { UserRole } from '../../users/users.types';
import { TurnstileProtectedDto } from '../../infra/turnstile/dto/turnstile-protected.dto';

export const REGISTERABLE_ROLES = [
  UserRole.Customer,
  UserRole.ProviderOwner,
] as const;

export class RegisterDto extends TurnstileProtectedDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsString()
  @MatchesField('password')
  @Expose({ name: 'repeat_password' })
  repeatPassword: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Expose({ name: 'full_name' })
  fullName: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsIn(REGISTERABLE_ROLES)
  role: UserRole;

  @IsBoolean()
  @Equals(true)
  @Expose({ name: 'terms_accepted' })
  termsAccepted: boolean;

  @IsString()
  @MaxLength(64)
  @Expose({ name: 'terms_version' })
  termsVersion: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  @Expose({ name: 'terms_hash' })
  termsHash: string;
}
