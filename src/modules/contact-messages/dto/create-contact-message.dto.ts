import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { TurnstileProtectedDto } from '../../infra/turnstile/dto/turnstile-protected.dto';

export class CreateContactMessageDto extends TurnstileProtectedDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  message: string;
}
