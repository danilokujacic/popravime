import { IsEnum } from 'class-validator';
import { RequestStatus } from '../repair-requests.types';

export class UpdateRepairRequestStatusDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;
}
