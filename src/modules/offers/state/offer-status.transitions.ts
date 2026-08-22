import { OfferStatus } from '../offers.types';

const ALLOWED_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  [OfferStatus.Pending]: [
    OfferStatus.Accepted,
    OfferStatus.Rejected,
    OfferStatus.Withdrawn,
  ],
  [OfferStatus.Accepted]: [],
  [OfferStatus.Rejected]: [],
  [OfferStatus.Withdrawn]: [],
};

export class OfferStatusTransitions {
  static CanTransition(from: OfferStatus, to: OfferStatus): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
  }
}
