import { Expose } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MatchesField } from '../../../common/validators/matches-field.decorator';
import { UserRole } from '../../users/users.types';

export const REGISTERABLE_ROLES = [
  UserRole.Customer,
  UserRole.ProviderOwner,
] as const;

export class RegisterDto {
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
}
