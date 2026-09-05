import { ModerationStatusTransitions } from './moderation-status.transitions';
import { RequestStatus } from '../repair-requests.types';

describe('ModerationStatusTransitions', () => {
  it('allows a moderator to approve a pending request', () => {
    expect(
      ModerationStatusTransitions.CanTransition(
        RequestStatus.PendingReview,
        RequestStatus.Open,
      ),
    ).toBe(true);
  });

  it('allows a moderator to reject a pending request', () => {
    expect(
      ModerationStatusTransitions.CanTransition(
        RequestStatus.PendingReview,
        RequestStatus.Rejected,
      ),
    ).toBe(true);
  });

  it('rejects reviewing a request that already left pending_review', () => {
    expect(
      ModerationStatusTransitions.CanTransition(
        RequestStatus.Open,
        RequestStatus.Rejected,
      ),
    ).toBe(false);
  });
});
