import { Expose } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';

export class AcceptTermsDto {
  @IsString()
  @MaxLength(64)
  version: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  @Expose({ name: 'document_hash' })
  documentHash: string;
}
