export const AUTH_THROTTLE = {
  default: {
    limit: Number(process.env.THROTTLE_AUTH_LIMIT ?? 5),
    ttl: Number(process.env.THROTTLE_AUTH_TTL_MS ?? 60000),
  },
};

export const CONTACT_MESSAGE_THROTTLE = {
  default: {
    limit: Number(process.env.THROTTLE_CONTACT_MESSAGE_LIMIT ?? 3),
    ttl: Number(process.env.THROTTLE_CONTACT_MESSAGE_TTL_MS ?? 60000),
  },
};
