import * as Joi from 'joi';

export const EnvValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGIN: Joi.string()
    .allow('')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().invalid('', '*').required().messages({
        'any.required':
          'CORS_ORIGIN must be set to a concrete allow-list of origins in production',
        'any.invalid':
          'CORS_ORIGIN must not be empty or "*" in production — set a concrete allow-list of origins',
      }),
      otherwise: Joi.string().optional(),
    }),
  // Base URL of the frontend app — used to build deep links in emails (see app.config.ts, which
  // trims any trailing slash). No strict URI validation: a wrong value degrades to a broken
  // link, not a security issue.
  FRONTEND_URL: Joi.string().default('http://localhost:3000'),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_SSL: Joi.boolean().default(false),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN_SECONDS: Joi.number().default(900),
  REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN_SECONDS: Joi.number().default(604800),

  BCRYPT_SALT_ROUNDS: Joi.number().min(4).max(15).default(10),

  STORAGE_ENDPOINT: Joi.string().uri().required(),
  STORAGE_REGION: Joi.string().default('auto'),
  STORAGE_BUCKET: Joi.string().required(),
  STORAGE_PRIVATE_BUCKET: Joi.string()
    .allow('')
    .invalid(Joi.ref('STORAGE_BUCKET'))
    .default('')
    .messages({
      'any.invalid':
        'STORAGE_PRIVATE_BUCKET must be a different bucket from STORAGE_BUCKET',
    }),
  STORAGE_SIGNED_URL_TTL_SECONDS: Joi.number().integer().min(60).default(3600),
  STORAGE_ACCESS_KEY: Joi.string().required(),
  STORAGE_SECRET_KEY: Joi.string().required(),
  STORAGE_FORCE_PATH_STYLE: Joi.boolean().default(true),
  STORAGE_PUBLIC_URL: Joi.string().uri().required(),

  EMAIL_HOST: Joi.string().required(),
  EMAIL_PORT: Joi.number().port().default(1025),
  EMAIL_SECURE: Joi.boolean().default(false),
  EMAIL_USER: Joi.string().allow('').optional(),
  EMAIL_PASSWORD: Joi.string().allow('').optional(),
  EMAIL_FROM: Joi.string().default('no-reply@popravime.me'),

  THROTTLE_DEFAULT_LIMIT: Joi.number().default(100),
  THROTTLE_DEFAULT_TTL_MS: Joi.number().default(60000),
  THROTTLE_AUTH_LIMIT: Joi.number().default(5),
  THROTTLE_AUTH_TTL_MS: Joi.number().default(60000),
  // POST /auth/refresh is fired silently on every page load (AuthProvider's session bootstrap)
  // and again by the frontend's 401-retry interceptor, so it needs a much more generous budget
  // than login/register — it's protected by a signed refresh JWT already, not a credential-guess
  // surface, and sharing THROTTLE_AUTH_LIMIT with them was bouncing legitimate users to /login
  // once they exhausted it just by browsing.
  THROTTLE_REFRESH_LIMIT: Joi.number().default(30),
  THROTTLE_REFRESH_TTL_MS: Joi.number().default(60000),
  THROTTLE_CONTACT_MESSAGE_LIMIT: Joi.number().default(3),
  THROTTLE_CONTACT_MESSAGE_TTL_MS: Joi.number().default(60000),
  THROTTLE_GEOCODING_LIMIT: Joi.number().default(20),
  THROTTLE_GEOCODING_TTL_MS: Joi.number().default(60000),
  // One resend click per IP per minute — separate from AUTH_THROTTLE (5/60s) since resend
  // enqueues an actual email send, not just a credential check.
  THROTTLE_RESEND_CONFIRMATION_LIMIT: Joi.number().default(1),
  THROTTLE_RESEND_CONFIRMATION_TTL_MS: Joi.number().default(60000),
  THROTTLE_OFFER_CREATE_LIMIT: Joi.number().default(5),
  THROTTLE_OFFER_CREATE_TTL_MS: Joi.number().default(60000),
  THROTTLE_OFFER_STATUS_LIMIT: Joi.number().default(10),
  THROTTLE_OFFER_STATUS_TTL_MS: Joi.number().default(60000),
  THROTTLE_DIRECT_INQUIRY_LIMIT: Joi.number().default(5),
  THROTTLE_DIRECT_INQUIRY_TTL_MS: Joi.number().default(60000),
  THROTTLE_REPAIR_REQUEST_CREATE_LIMIT: Joi.number().default(5),
  THROTTLE_REPAIR_REQUEST_CREATE_TTL_MS: Joi.number().default(60000),
  THROTTLE_MESSAGE_LIMIT: Joi.number().default(20),
  THROTTLE_MESSAGE_TTL_MS: Joi.number().default(60000),
  // Per-recipient cap on transactional emails regardless of which IP/account triggered them —
  // guards against a flood spread across many accounts/IPs that per-endpoint throttling can't see.
  THROTTLE_EMAIL_RECIPIENT_LIMIT: Joi.number().default(20),
  THROTTLE_EMAIL_RECIPIENT_TTL_MS: Joi.number().default(3600000),

  GEOCODING_USER_AGENT: Joi.string().required(),

  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_PASSWORD: Joi.string().min(8).required(),

  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().allow('').optional(),
  FACEBOOK_CLIENT_ID: Joi.string().allow('').optional(),
  FACEBOOK_CLIENT_SECRET: Joi.string().allow('').optional(),
  FACEBOOK_CALLBACK_URL: Joi.string().uri().allow('').optional(),
  OAUTH_FRONTEND_REDIRECT_URL: Joi.string().uri().allow('').optional(),
  OAUTH_EXCHANGE_CODE_TTL_SECONDS: Joi.number().default(60),

  VERIFICATION_REQUIRED: Joi.boolean().default(true),

  // How long a POST /auth/register or /auth/resend-confirmation email-confirmation link stays
  // valid. Default 24h.
  EMAIL_CONFIRMATION_TTL_SECONDS: Joi.number().default(86400),

  LEGAL_TERMS_VERSION: Joi.string().default('2026-09-18'),

  RETENTION_INACTIVE_ACCOUNTS_DAYS: Joi.number().integer().min(1).default(60),
  RETENTION_COMPLETED_REQUESTS_DAYS: Joi.number().integer().min(1).default(730),
  RETENTION_UNACCEPTED_REQUESTS_DAYS: Joi.number()
    .integer()
    .min(1)
    .default(180),
  RETENTION_INQUIRIES_DAYS: Joi.number().integer().min(1).default(365),
  RETENTION_CONTACT_MESSAGES_DAYS: Joi.number().integer().min(1).default(365),
  RETENTION_BATCH_SIZE: Joi.number().integer().min(1).default(500),
  RETENTION_SCHEDULE: Joi.string().default('0 3 * * *'),
});
