import { Expose } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';

export class ListMessagesQueryDto {
  @IsOptional()
  @IsUUID()
  @Expose({ name: 'request_id' })
  requestId?: string;

  @IsOptional()
  @IsUUID()
  @Expose({ name: 'inquiry_id' })
  inquiryId?: string;
}
