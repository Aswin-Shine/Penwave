import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) { logger.error('Redis: max retries exceeded'); return null; }
        return Math.min(times * 100, 3000);
      },
      enableReadyCheck: false,
    });
    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('error', (err) => logger.error('Redis error', { err }));
    redisClient.on('close', () => logger.warn('Redis connection closed'));
  }
  return redisClient;
}

export const redis = getRedisClient();

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    if (!data) return null;
    try { return JSON.parse(data) as T; } catch { return null; }
  },
  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },
  async del(key: string): Promise<void> { await redis.del(key); },
  // FIX H-3: SCAN instead of KEYS — non-blocking at scale
  async delPattern(pattern: string): Promise<void> {
    let cursor = '0';
    const toDelete: string[] = [];
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      toDelete.push(...keys);
    } while (cursor !== '0');
    if (toDelete.length > 0) {
      for (let i = 0; i < toDelete.length; i += 100) {
        await redis.del(...toDelete.slice(i, i + 100));
      }
    }
  },
  async exists(key: string): Promise<boolean> { return (await redis.exists(key)) === 1; },
};

export const CACHE_TTL = { SHORT: 60, MEDIUM: 300, LONG: 1800, HOUR: 3600, DAY: 86400 } as const;

export const CACHE_KEYS = {
  post: (slug: string) => `post:${slug}`,
  postList: (page: number, limit: number, tag?: string, sort?: string) => `posts:${page}:${limit}:${tag ?? 'all'}:${sort ?? 'latest'}`,
  trending: () => 'posts:trending',
  user: (username: string) => `user:${username}`,
  tags: () => 'tags:all',
  search: (type: string, query: string, page: number, limit: number) => `search:${type}:${query}:${page}:${limit}`,
} as const;
