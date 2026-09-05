import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import type { ConfigType } from '@nestjs/config';
import { oauthConfig } from '../../../config/oauth.config';
import { OAuthProfile, OAuthProvider } from '../../users/users.types';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(oauthConfig.KEY)
    config: ConfigType<typeof oauthConfig>,
  ) {
    super({
      clientID: config.google.clientId || 'unconfigured',
      clientSecret: config.google.clientSecret || 'unconfigured',
      callbackURL: config.google.callbackUrl,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(null, false);
      return;
    }

    const oauthProfile: OAuthProfile = {
      provider: OAuthProvider.Google,
      providerId: profile.id,
      email,
      fullName: profile.displayName || email,
    };
    done(null, oauthProfile);
  }
}
