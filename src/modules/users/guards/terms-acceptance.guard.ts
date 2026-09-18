import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TermsAcceptanceService } from '../terms-acceptance.service';
import { ALLOW_UNACCEPTED_TERMS_KEY } from '../../../common/decorators/allow-unaccepted-terms.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-request.interface';
import { DomainForbiddenException } from '../../../common/exceptions/forbidden.exception';

@Injectable()
export class TermsAcceptanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly termsAcceptanceService: TermsAcceptanceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user || this.IsExempt(context)) {
      return true;
    }

    const hasAccepted = await this.termsAcceptanceService.HasAccepted(
      request.user.id,
    );
    if (!hasAccepted) {
      throw new DomainForbiddenException(
        'TERMS_NOT_ACCEPTED',
        'Accept the current privacy policy and terms to continue',
      );
    }
    return true;
  }

  private IsExempt(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean | undefined>(
        ALLOW_UNACCEPTED_TERMS_KEY,
        [context.getHandler(), context.getClass()],
      ) === true
    );
  }
}
