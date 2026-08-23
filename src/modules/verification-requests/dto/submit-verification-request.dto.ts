import { Expose } from 'class-transformer';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SubmitVerificationRequestDto {
  @IsUUID()
  @Expose({ name: 'provider_id' })
  providerId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Expose({ name: 'apr_number' })
  aprNumber: string;
}
