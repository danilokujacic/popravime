import {
  EligibleStatuses,
  IsEligibleVerificationStatus,
  VerificationStatus,
} from './providers.types';

describe('IsEligibleVerificationStatus', () => {
  it('treats a verified provider as eligible regardless of the flag', () => {
    expect(
      IsEligibleVerificationStatus(VerificationStatus.Verified, true),
    ).toBe(true);
    expect(
      IsEligibleVerificationStatus(VerificationStatus.Verified, false),
    ).toBe(true);
  });

  it('treats a pending provider as eligible only when verification is not required', () => {
    expect(
      IsEligibleVerificationStatus(VerificationStatus.Pending, true),
    ).toBe(false);
    expect(
      IsEligibleVerificationStatus(VerificationStatus.Pending, false),
    ).toBe(true);
  });

  it('never treats a rejected provider as eligible', () => {
    expect(
      IsEligibleVerificationStatus(VerificationStatus.Rejected, true),
    ).toBe(false);
    expect(
      IsEligibleVerificationStatus(VerificationStatus.Rejected, false),
    ).toBe(false);
  });
});

describe('EligibleStatuses', () => {
  it('returns only verified when verification is required', () => {
    expect(EligibleStatuses(true)).toEqual([VerificationStatus.Verified]);
  });

  it('returns verified and pending when verification is not required', () => {
    expect(EligibleStatuses(false)).toEqual([
      VerificationStatus.Verified,
      VerificationStatus.Pending,
    ]);
  });
});
