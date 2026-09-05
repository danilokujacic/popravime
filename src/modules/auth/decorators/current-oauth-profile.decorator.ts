import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OAuthRequest } from '../interfaces/oauth-request.interface';
import { OAuthProfile } from '../../users/users.types';

export const CurrentOAuthProfile = createParamDecorator(
  (_data: unknown, context: ExecutionContext): OAuthProfile => {
    const request = context.switchToHttp().getRequest<OAuthRequest>();
    return request.user;
  },
);
