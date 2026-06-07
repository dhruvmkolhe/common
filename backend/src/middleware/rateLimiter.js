import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for short link creation to prevent abuse and DDoS.
 * Allows 30 requests per minute per IP.
 */
export const shortenLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: {
    error: 'Too many requests. Please wait a minute before shortening more URLs.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for auth endpoints (signup/login) to prevent brute-force.
 * Allows 10 requests per minute per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: {
    error: 'Too many authentication attempts. Please try again after a minute.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
