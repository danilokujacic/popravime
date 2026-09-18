import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TermsAcceptanceGuard } from './terms-acceptance.guard';
import { TermsAcceptanceService } from '../terms-acceptance.service';
import { DomainForbiddenException } from '../../../common/exceptions/forbidden.exception';

function BuildContext(user?: { id: string }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function BuildGuard(options: { exempt?: boolean; accepted?: boolean }) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(options.exempt),
  } as unknown as Reflector;
  const termsAcceptanceService = {
    HasAccepted: jest.fn().mockResolvedValue(options.accepted ?? true),
  } as unknown as TermsAcceptanceService;

  return {
    guard: new TermsAcceptanceGuard(reflector, termsAcceptanceService),
    termsAcceptanceService,
  };
}

describe('TermsAcceptanceGuard', () => {
  it('lets a request with no authenticated user through (public routes)', async () => {
    const { guard, termsAcceptanceService } = BuildGuard({ accepted: false });

    await expect(guard.canActivate(BuildContext())).resolves.toBe(true);
    expect(termsAcceptanceService.HasAccepted).not.toHaveBeenCalled();
  });

  it('lets a user who accepted the current terms through', async () => {
    const { guard } = BuildGuard({ accepted: true });

    await expect(guard.canActivate(BuildContext({ id: 'u1' }))).resolves.toBe(
      true,
    );
  });

  it('rejects a user who has not accepted with TERMS_NOT_ACCEPTED', async () => {
    const { guard } = BuildGuard({ accepted: false });

    await expect(
      guard.canActivate(BuildContext({ id: 'u1' })),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
  });

  it('skips the check on routes marked as allowed without acceptance', async () => {
    const { guard, termsAcceptanceService } = BuildGuard({
      exempt: true,
      accepted: false,
    });

    await expect(guard.canActivate(BuildContext({ id: 'u1' }))).resolves.toBe(
      true,
    );
    expect(termsAcceptanceService.HasAccepted).not.toHaveBeenCalled();
  });
});
