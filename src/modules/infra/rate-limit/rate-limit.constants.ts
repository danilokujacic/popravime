export const AUTH_THROTTLE = {
  default: {
    limit: Number(process.env.THROTTLE_AUTH_LIMIT ?? 5),
    ttl: Number(process.env.THROTTLE_AUTH_TTL_MS ?? 60000),
  },
};

// One resend click per IP per minute — resend enqueues an actual email send, not just a
// credential check, so it needs a tighter budget than AUTH_THROTTLE.
export const RESEND_CONFIRMATION_THROTTLE = {
  default: {
    limit: Number(process.env.THROTTLE_RESEND_CONFIRMATION_LIMIT ?? 1),
    ttl: Number(process.env.THROTTLE_RESEND_CONFIRMATION_TTL_MS ?? 60000),
  },
};

// Separate, more generous budget for POST /auth/refresh — see env.validation.ts for why it can't
// share AUTH_THROTTLE.
export const REFRESH_THROTTLE = {
  default: {
    limit: Number(process.env.THROTTLE_REFRESH_LIMIT ?? 30),
    ttl: Number(process.env.THROTTLE_REFRESH_TTL_MS ?? 60000),
  },
};

export const CONTACT_MESSAGE_THROTTLE = {
  default: {
    limit: Number(process.env.THROTTLE_CONTACT_MESSAGE_LIMIT ?? 3),
    ttl: Number(process.env.THROTTLE_CONTACT_MESSAGE_TTL_MS ?? 60000),
  },
};

// GET /cities/lookup-by-coordinates calls out to Nominatim on every request (no caching — the
// input space is unbounded lat/lng pairs). Nominatim's usage policy is ~1 req/sec for our whole
// app's shared User-Agent, so this needs its own tight budget to stop one client from getting
// that User-Agent rate-limited/blocked for everyone.
export const GEOCODING_THROTTLE = {
  default: {
    limit: Number(process.env.THROTTLE_GEOCODING_LIMIT ?? 20),
    ttl: Number(process.env.THROTTLE_GEOCODING_TTL_MS ?? 60000),
  },
};
