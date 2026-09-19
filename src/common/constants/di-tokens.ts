export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');
export const EMAIL_LIMIT_REDIS = Symbol('EMAIL_LIMIT_REDIS');
export const GEOCODING_SERVICE = Symbol('GEOCODING_SERVICE');
export const TURNSTILE_SERVICE = Symbol('TURNSTILE_SERVICE');

export const EMAIL_QUEUE_NAME = 'email';
export const RETENTION_QUEUE_NAME = 'retention';
export const RETENTION_SCHEDULER_ID = 'retention-daily-purge';
