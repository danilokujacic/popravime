import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import type { ConfigType } from '@nestjs/config';
import { oauthConfig } from '../../../config/oauth.config';
import { OAuthProfile, OAuthProvider } from '../../users/users.types';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    @Inject(oauthConfig.KEY)
    config: ConfigType<typeof oauthConfig>,
  ) {
    super({
      clientID: config.facebook.clientId || 'unconfigured',
      clientSecret: config.facebook.clientSecret || 'unconfigured',
      callbackURL: config.facebook.callbackUrl,
      profileFields: ['id', 'displayName', 'emails'],
      scope: ['email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: OAuthProfile | false) => void,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(null, false);
      return;
    }

    done(null, {
      provider: OAuthProvider.Facebook,
      providerId: profile.id,
      email,
      fullName: profile.displayName || email,
    });
  }
}
