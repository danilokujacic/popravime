import * as Joi from 'joi';

export const EnvValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGIN: Joi.string().allow('').optional(),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),

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
  THROTTLE_CONTACT_MESSAGE_LIMIT: Joi.number().default(3),
  THROTTLE_CONTACT_MESSAGE_TTL_MS: Joi.number().default(60000),

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
});
