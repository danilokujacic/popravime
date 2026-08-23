import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateFaqItemDto {
  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Expose({ name: 'sort_order' })
  sortOrder?: number;
}
