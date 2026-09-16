import { RequestStatus } from '../repair-requests.types';

const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.PendingReview]: [],
  [RequestStatus.Open]: [RequestStatus.OffersReceived, RequestStatus.Cancelled],
  [RequestStatus.OffersReceived]: [
    RequestStatus.Accepted,
    RequestStatus.Cancelled,
  ],
  [RequestStatus.Accepted]: [
    RequestStatus.InProgress,
    RequestStatus.Cancelled,
    RequestStatus.Open,
  ],
  [RequestStatus.InProgress]: [
    RequestStatus.Completed,
    RequestStatus.Cancelled,
    RequestStatus.Open,
  ],
  [RequestStatus.Completed]: [],
  [RequestStatus.Cancelled]: [],
  [RequestStatus.Rejected]: [],
};

export class RequestStatusTransitions {
  static CanTransition(from: RequestStatus, to: RequestStatus): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
  }
}
