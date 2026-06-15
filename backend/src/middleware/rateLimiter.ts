import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../lib/redis';
import { env } from '../config/env';

// FIX H-2: Redis store — limits shared across all processes/instances.
function makeRedisStore(prefix: string) {
  return new RedisStore({
    // @ts-expect-error ioredis / rate-limit-redis sendCommand type mismatch
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix,
  });
}

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:global:'),
  message: { success: false, message: 'Too many requests, please try again later' },
  skip: () => env.NODE_ENV === 'test',
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:auth:'),
  message: { success: false, message: 'Too many authentication attempts, please try again in 15 minutes' },
  skip: () => env.NODE_ENV === 'test',
});

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:search:'),
  message: { success: false, message: 'Search rate limit exceeded' },
  skip: () => env.NODE_ENV === 'test',
});
