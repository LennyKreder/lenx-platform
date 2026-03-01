export const COOKIE_NAMES = {
  ADMIN_AUTH: 'lbl_admin_auth',
  CUSTOMER_SESSION: 'lbl_sess',
} as const;

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export const RATE_LIMITS = {
  ADMIN_LOGIN: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  MAGIC_LINK: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
} as const;
