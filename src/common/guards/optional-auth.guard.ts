import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import { jwtConfig } from '../../config/jwt.config';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';
import { AuthenticatedUser } from '../interfaces/authenticated-request.interface';

function ExtractBearerToken(header: string | undefined): string | undefined {
  if (!header?.startsWith('Bearer ')) {
    return undefined;
  }
  return header.slice('Bearer '.length);
}

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const token = ExtractBearerToken(request.headers.authorization);

    if (!token) {
      return true;
    }

    request.user = await this.TryAuthenticate(token);
    return true;
  }

  private async TryAuthenticate(
    token: string,
  ): Promise<AuthenticatedUser | undefined> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.accessSecret,
      });
      return { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      return undefined;
    }
  }
}
