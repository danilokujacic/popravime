import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { RequireTurnstile } from '../infra/turnstile/require-turnstile.decorator';
import { AuthService } from './auth.service';
import { OAuthExchangeService } from './oauth-exchange.service';
import { RegisterDto } from './dto/register.dto';
import { BuildTermsEvidence } from '../users/terms-evidence.builder';
import { LoginDto } from './dto/login.dto';
import { OAuthExchangeDto } from './dto/oauth-exchange.dto';
import { OAuthCompleteDto } from './dto/oauth-complete.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { ResendConfirmationDto } from './dto/resend-confirmation.dto';
import { PendingConfirmationDto } from './dto/pending-confirmation.dto';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import {
  AUTH_THROTTLE,
  REFRESH_THROTTLE,
  RESEND_CONFIRMATION_THROTTLE,
} from '../infra/rate-limit/rate-limit.constants';
import { CurrentRefreshSession } from './decorators/current-refresh-session.decorator';
import type { RefreshTokenSession } from './interfaces/refresh-token-session.interface';
import { CurrentOAuthProfile } from './decorators/current-oauth-profile.decorator';
import type { OAuthProfile } from '../users/users.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthExchangeService: OAuthExchangeService,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @RequireTurnstile()
  @Post('register')
  Register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
  ): Promise<PendingConfirmationDto> {
    return this.authService.Register(
      {
        email: dto.email,
        password: dto.password,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role,
      },
      BuildTermsEvidence(request, dto.termsVersion, dto.termsHash),
    );
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('confirm-email')
  ConfirmEmail(@Body() dto: ConfirmEmailDto): Promise<AuthTokensDto> {
    return this.authService.ConfirmEmail(dto.slug);
  }

  @Public()
  @Throttle(RESEND_CONFIRMATION_THROTTLE)
  @RequireTurnstile()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('resend-confirmation')
  ResendConfirmation(@Body() dto: ResendConfirmationDto): Promise<void> {
    return this.authService.ResendConfirmation(dto.email);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  Login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.authService.Login({ email: dto.email, password: dto.password });
  }

  @Public()
  @Throttle(REFRESH_THROTTLE)
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  Refresh(@CurrentUser() user: AuthenticatedUser): Promise<AuthTokensDto> {
    return this.authService.Refresh(user);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  Logout(@CurrentRefreshSession() session: RefreshTokenSession): Promise<void> {
    return this.authService.Logout(session);
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  GoogleLogin(): void {}

  @Public()
  @UseGuards(AuthGuard('google'))
  @Redirect()
  @Get('google/callback')
  async GoogleCallback(
    @CurrentOAuthProfile() profile: OAuthProfile,
  ): Promise<{ url: string }> {
    return this.CompleteOAuthLogin(profile);
  }

  @Public()
  @UseGuards(AuthGuard('facebook'))
  @Get('facebook')
  FacebookLogin(): void {}

  @Public()
  @UseGuards(AuthGuard('facebook'))
  @Redirect()
  @Get('facebook/callback')
  async FacebookCallback(
    @CurrentOAuthProfile() profile: OAuthProfile,
  ): Promise<{ url: string }> {
    return this.CompleteOAuthLogin(profile);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('oauth/exchange')
  OAuthExchange(@Body() dto: OAuthExchangeDto): Promise<AuthTokensDto> {
    return this.oauthExchangeService.ConsumeTokenCode(dto.code);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('oauth/complete')
  async OAuthComplete(@Body() dto: OAuthCompleteDto): Promise<AuthTokensDto> {
    const profile = await this.oauthExchangeService.ConsumeProfileCode(
      dto.code,
    );
    return this.authService.CompleteOAuthSignup(profile, dto.role);
  }

  private async CompleteOAuthLogin(
    profile: OAuthProfile,
  ): Promise<{ url: string }> {
    const tokens = await this.authService.TryOAuthLogin(profile);
    if (tokens) {
      const code = await this.oauthExchangeService.CreateTokenCode(tokens);
      return { url: this.oauthExchangeService.BuildTokenRedirectUrl(code) };
    }

    const code = await this.oauthExchangeService.CreateProfileCode(profile);
    return {
      url: this.oauthExchangeService.BuildRoleSelectionRedirectUrl(code),
    };
  }
}
