import { IsString, MaxLength, MinLength } from 'class-validator';

export class RespondToReviewDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  response: string;
}
