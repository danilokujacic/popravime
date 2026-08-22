import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddGalleryImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  caption?: string;
}
