import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RefreshTokenSession } from '../interfaces/refresh-token-session.interface';

interface RefreshTokenRequest extends Request {
  user: RefreshTokenSession;
}

export const CurrentRefreshSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RefreshTokenSession => {
    const request = context.switchToHttp().getRequest<RefreshTokenRequest>();
    return request.user;
  },
);
