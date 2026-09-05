import { RequestStatus } from '../repair-requests.types';

const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.PendingReview]: [RequestStatus.Open, RequestStatus.Rejected],
  [RequestStatus.Open]: [],
  [RequestStatus.OffersReceived]: [],
  [RequestStatus.Accepted]: [],
  [RequestStatus.InProgress]: [],
  [RequestStatus.Completed]: [],
  [RequestStatus.Cancelled]: [],
  [RequestStatus.Rejected]: [],
};

export class ModerationStatusTransitions {
  static CanTransition(from: RequestStatus, to: RequestStatus): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
  }
}
