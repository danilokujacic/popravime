import { Expose } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_TURNSTILE_TOKEN_LENGTH } from '../turnstile.types';

export abstract class TurnstileProtectedDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_TURNSTILE_TOKEN_LENGTH)
  @Expose({ name: 'turnstile_token' })
  turnstileToken?: string;
}
