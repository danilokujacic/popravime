import { IsIn, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../users/users.types';
import { REGISTERABLE_ROLES } from './register.dto';

export class OAuthCompleteDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsIn(REGISTERABLE_ROLES)
  role: UserRole;
}
