import { IsIn } from 'class-validator';
import { OfferStatus } from '../offers.types';

const TARGET_STATUSES = [
  OfferStatus.Accepted,
  OfferStatus.Rejected,
  OfferStatus.Withdrawn,
] as const;

export class UpdateOfferStatusDto {
  @IsIn(TARGET_STATUSES)
  status: (typeof TARGET_STATUSES)[number];
}
