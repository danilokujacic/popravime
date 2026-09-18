import { IsBoolean } from 'class-validator';

export class SetProviderApprovalDto {
  @IsBoolean()
  approved: boolean;
}
