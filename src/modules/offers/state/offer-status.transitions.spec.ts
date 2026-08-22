import { OfferStatusTransitions } from './offer-status.transitions';
import { OfferStatus } from '../offers.types';

describe('OfferStatusTransitions', () => {
  it('allows a pending offer to be accepted', () => {
    expect(
      OfferStatusTransitions.CanTransition(
        OfferStatus.Pending,
        OfferStatus.Accepted,
      ),
    ).toBe(true);
  });

  it('allows a pending offer to be rejected', () => {
    expect(
      OfferStatusTransitions.CanTransition(
        OfferStatus.Pending,
        OfferStatus.Rejected,
      ),
    ).toBe(true);
  });

  it('allows a pending offer to be withdrawn', () => {
    expect(
      OfferStatusTransitions.CanTransition(
        OfferStatus.Pending,
        OfferStatus.Withdrawn,
      ),
    ).toBe(true);
  });

  it('rejects any transition out of a terminal state', () => {
    expect(
      OfferStatusTransitions.CanTransition(
        OfferStatus.Accepted,
        OfferStatus.Pending,
      ),
    ).toBe(false);
    expect(
      OfferStatusTransitions.CanTransition(
        OfferStatus.Rejected,
        OfferStatus.Accepted,
      ),
    ).toBe(false);
    expect(
      OfferStatusTransitions.CanTransition(
        OfferStatus.Withdrawn,
        OfferStatus.Pending,
      ),
    ).toBe(false);
  });

  it('rejects an accepted offer from being rejected', () => {
    expect(
      OfferStatusTransitions.CanTransition(
        OfferStatus.Accepted,
        OfferStatus.Rejected,
      ),
    ).toBe(false);
  });
});
