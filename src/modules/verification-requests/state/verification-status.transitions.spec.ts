import { VerificationStatusTransitions } from './verification-status.transitions';
import { VerificationRequestStatus } from '../verification-requests.types';

describe('VerificationStatusTransitions', () => {
  it('allows a pending request to be approved', () => {
    expect(
      VerificationStatusTransitions.CanTransition(
        VerificationRequestStatus.Pending,
        VerificationRequestStatus.Approved,
      ),
    ).toBe(true);
  });

  it('allows a pending request to be rejected', () => {
    expect(
      VerificationStatusTransitions.CanTransition(
        VerificationRequestStatus.Pending,
        VerificationRequestStatus.Rejected,
      ),
    ).toBe(true);
  });

  it('rejects any transition out of a terminal state', () => {
    expect(
      VerificationStatusTransitions.CanTransition(
        VerificationRequestStatus.Approved,
        VerificationRequestStatus.Rejected,
      ),
    ).toBe(false);
    expect(
      VerificationStatusTransitions.CanTransition(
        VerificationRequestStatus.Rejected,
        VerificationRequestStatus.Approved,
      ),
    ).toBe(false);
  });

  it('rejects re-pending an already-decided request', () => {
    expect(
      VerificationStatusTransitions.CanTransition(
        VerificationRequestStatus.Approved,
        VerificationRequestStatus.Pending,
      ),
    ).toBe(false);
  });
});
