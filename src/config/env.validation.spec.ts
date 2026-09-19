import { EnvValidationSchema } from './env.validation';

function BuildBaseEnv(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    DATABASE_HOST: 'localhost',
    DATABASE_USER: 'postgres',
    DATABASE_PASSWORD: 'postgres',
    DATABASE_NAME: 'popravime',
    REDIS_HOST: 'localhost',
    JWT_SECRET: 'a'.repeat(16),
    REFRESH_SECRET: 'b'.repeat(16),
    STORAGE_ENDPOINT: 'https://storage.example.com',
    STORAGE_BUCKET: 'bucket',
    STORAGE_PRIVATE_BUCKET: 'bucket-private',
    STORAGE_ACCESS_KEY: 'access',
    STORAGE_SECRET_KEY: 'secret',
    STORAGE_PUBLIC_URL: 'https://cdn.example.com',
    EMAIL_HOST: 'localhost',
    GEOCODING_USER_AGENT: 'popravime/1.0',
    ADMIN_EMAIL: 'admin@example.com',
    ADMIN_PASSWORD: 'password123',
    ...overrides,
  };
}

describe('EnvValidationSchema', () => {
  it('accepts a valid development env without CORS_ORIGIN set', () => {
    const result = EnvValidationSchema.validate(
      BuildBaseEnv({ NODE_ENV: 'development' }),
      { abortEarly: false },
    );

    expect(result.error).toBeUndefined();
  });

  it('rejects a production env with CORS_ORIGIN unset', () => {
    const result = EnvValidationSchema.validate(
      BuildBaseEnv({ NODE_ENV: 'production' }),
      { abortEarly: false },
    );

    expect(result.error?.message).toContain('CORS_ORIGIN');
  });

  it('rejects a production env with CORS_ORIGIN set to "*"', () => {
    const result = EnvValidationSchema.validate(
      BuildBaseEnv({ NODE_ENV: 'production', CORS_ORIGIN: '*' }),
      { abortEarly: false },
    );

    expect(result.error?.message).toContain('CORS_ORIGIN');
  });

  it('accepts a production env with a concrete CORS_ORIGIN allow-list', () => {
    const result = EnvValidationSchema.validate(
      BuildBaseEnv({
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://popravime.me',
        TURNSTILE_SECRET_KEY: 'turnstile-secret',
      }),
      { abortEarly: false },
    );

    expect(result.error).toBeUndefined();
  });

  it('rejects a production env with TURNSTILE_SECRET_KEY unset', () => {
    const result = EnvValidationSchema.validate(
      BuildBaseEnv({
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://popravime.me',
      }),
      { abortEarly: false },
    );

    expect(result.error?.message).toContain('TURNSTILE_SECRET_KEY');
  });

  it('rejects a production env with TURNSTILE_SECRET_KEY empty', () => {
    const result = EnvValidationSchema.validate(
      BuildBaseEnv({
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://popravime.me',
        TURNSTILE_SECRET_KEY: '',
      }),
      { abortEarly: false },
    );

    expect(result.error?.message).toContain('TURNSTILE_SECRET_KEY');
  });

  it('accepts a development env with TURNSTILE_SECRET_KEY empty', () => {
    const result = EnvValidationSchema.validate(
      BuildBaseEnv({ NODE_ENV: 'development', TURNSTILE_SECRET_KEY: '' }),
      { abortEarly: false },
    );

    expect(result.error).toBeUndefined();
  });

  it('defaults DATABASE_SSL to false', () => {
    const result = EnvValidationSchema.validate(
      BuildBaseEnv({ NODE_ENV: 'development' }),
      { abortEarly: false },
    );

    expect(result.value.DATABASE_SSL).toBe(false);
  });

  it('accepts an env with no private bucket configured', () => {
    const result = EnvValidationSchema.validate(
      BuildBaseEnv({ STORAGE_PRIVATE_BUCKET: '' }),
      { abortEarly: false },
    );

    expect(result.error).toBeUndefined();
  });

  it('rejects a private bucket that is the same as the public one', () => {
    const result = EnvValidationSchema.validate(
      BuildBaseEnv({ STORAGE_PRIVATE_BUCKET: 'bucket' }),
      { abortEarly: false },
    );

    expect(result.error?.message).toContain('STORAGE_PRIVATE_BUCKET');
  });
});
