import { registerAs } from '@nestjs/config';

export interface OAuthConfig {
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  facebook: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  frontendRedirectUrl: string;
  exchangeCodeTtlSeconds: number;
}

export const oauthConfig = registerAs('oauth', (): OAuthConfig => ({
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:3001/auth/google/callback',
  },
  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID ?? '',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? '',
    callbackUrl:
      process.env.FACEBOOK_CALLBACK_URL ??
      'http://localhost:3001/auth/facebook/callback',
  },
  frontendRedirectUrl:
    process.env.OAUTH_FRONTEND_REDIRECT_URL ??
    'http://localhost:3000/auth/callback',
  exchangeCodeTtlSeconds: Number(
    process.env.OAUTH_EXCHANGE_CODE_TTL_SECONDS ?? 60,
  ),
}));
