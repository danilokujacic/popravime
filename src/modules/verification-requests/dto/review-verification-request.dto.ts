import { Expose } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewVerificationRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Expose({ name: 'review_notes' })
  reviewNotes?: string;
}
