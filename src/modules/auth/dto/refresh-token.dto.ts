import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @Expose({ name: 'refresh_token' })
  refreshToken: string;
}
