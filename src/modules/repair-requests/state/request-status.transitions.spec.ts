import { RequestStatusTransitions } from './request-status.transitions';
import { RequestStatus } from '../repair-requests.types';

describe('RequestStatusTransitions', () => {
  it('allows the first offer to move an open request to offers_received', () => {
    expect(
      RequestStatusTransitions.CanTransition(RequestStatus.Open, RequestStatus.OffersReceived),
    ).toBe(true);
  });

  it('allows accepting an offer once offers have been received', () => {
    expect(
      RequestStatusTransitions.CanTransition(RequestStatus.OffersReceived, RequestStatus.Accepted),
    ).toBe(true);
  });

  it('allows progressing from accepted to in_progress to completed', () => {
    expect(
      RequestStatusTransitions.CanTransition(RequestStatus.Accepted, RequestStatus.InProgress),
    ).toBe(true);
    expect(
      RequestStatusTransitions.CanTransition(RequestStatus.InProgress, RequestStatus.Completed),
    ).toBe(true);
  });

  it('allows cancelling from any non-terminal state', () => {
    expect(RequestStatusTransitions.CanTransition(RequestStatus.Open, RequestStatus.Cancelled)).toBe(
      true,
    );
    expect(
      RequestStatusTransitions.CanTransition(RequestStatus.Accepted, RequestStatus.Cancelled),
    ).toBe(true);
  });

  it('rejects skipping states', () => {
    expect(RequestStatusTransitions.CanTransition(RequestStatus.Open, RequestStatus.Accepted)).toBe(
      false,
    );
    expect(
      RequestStatusTransitions.CanTransition(RequestStatus.Open, RequestStatus.Completed),
    ).toBe(false);
  });

  it('rejects any transition out of terminal states', () => {
    expect(
      RequestStatusTransitions.CanTransition(RequestStatus.Completed, RequestStatus.InProgress),
    ).toBe(false);
    expect(
      RequestStatusTransitions.CanTransition(RequestStatus.Cancelled, RequestStatus.Open),
    ).toBe(false);
  });

  it('rejects reopening a request by going backwards', () => {
    expect(
      RequestStatusTransitions.CanTransition(RequestStatus.Accepted, RequestStatus.OffersReceived),
    ).toBe(false);
  });
});
