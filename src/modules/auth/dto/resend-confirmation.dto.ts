import { IsEmail } from 'class-validator';
import { TurnstileProtectedDto } from '../../infra/turnstile/dto/turnstile-protected.dto';

export class ResendConfirmationDto extends TurnstileProtectedDto {
  @IsEmail()
  email: string;
}
