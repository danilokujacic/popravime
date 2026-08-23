import { VerificationRequestStatus } from '../verification-requests.types';

const ALLOWED_TRANSITIONS: Record<
  VerificationRequestStatus,
  VerificationRequestStatus[]
> = {
  [VerificationRequestStatus.Pending]: [
    VerificationRequestStatus.Approved,
    VerificationRequestStatus.Rejected,
  ],
  [VerificationRequestStatus.Approved]: [],
  [VerificationRequestStatus.Rejected]: [],
};

export class VerificationStatusTransitions {
  static CanTransition(
    from: VerificationRequestStatus,
    to: VerificationRequestStatus,
  ): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
  }
}
