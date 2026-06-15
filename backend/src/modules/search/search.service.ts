import { prisma } from '../../lib/prisma';
import { cache, CACHE_TTL } from '../../lib/redis';
import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200).trim(),
  type: z.enum(['all', 'posts', 'users', 'tags']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export class SearchService {
  async search(query: string, type: string, page: number, limit: number) {
    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `search:${type}:${normalizedQuery}:${page}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const sanitized = query.replace(/[&|!():*]/g, ' ').trim();
    const skip = (page - 1) * limit;

    const results: { posts?: unknown[]; users?: unknown[]; tags?: unknown[] } = {};

    if (type === 'all' || type === 'posts') {
      // Uses stored search_vector GIN index (migration 20260612000001_add_fts_gin_index)
      results.posts = await prisma.$queryRaw<unknown[]>`
        SELECT
          p.id, p.title, p.slug, p.excerpt, p."coverImage",
          p."publishedAt", p."readingTime", p."likeCount", p."commentCount",
          u.username AS "authorUsername",
          pr."displayName" AS "authorDisplayName",
          pr."avatarUrl" AS "authorAvatar",
          ts_rank(p.search_vector, plainto_tsquery('english', ${sanitized})) AS rank
        FROM posts p
        JOIN users u ON u.id = p."authorId"
        LEFT JOIN profiles pr ON pr."userId" = u.id
        WHERE
          p."deletedAt" IS NULL
          AND p.status = 'PUBLISHED'
          AND p.search_vector @@ plainto_tsquery('english', ${sanitized})
        ORDER BY rank DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
    }

    if (type === 'all' || type === 'users') {
      results.users = await prisma.$queryRaw<unknown[]>`
        SELECT
          u.id, u.username, pr."displayName", pr."avatarUrl", pr.bio,
          (SELECT COUNT(*) FROM posts WHERE "authorId" = u.id AND status = 'PUBLISHED') AS "postCount",
          (SELECT COUNT(*) FROM follows WHERE "followingId" = u.id) AS "followerCount"
        FROM users u
        LEFT JOIN profiles pr ON pr."userId" = u.id
        WHERE
          u."deletedAt" IS NULL AND u."isActive" = true
          AND (
            u.username ILIKE ${'%' + sanitized + '%'}
            OR pr."displayName" ILIKE ${'%' + sanitized + '%'}
          )
        LIMIT ${limit} OFFSET ${skip}
      `;
    }

    if (type === 'all' || type === 'tags') {
      results.tags = await prisma.tag.findMany({
        where: {
          OR: [
            { name: { contains: sanitized, mode: 'insensitive' } },
            { slug: { contains: sanitized, mode: 'insensitive' } },
          ],
        },
        orderBy: { postCount: 'desc' },
        take: limit,
        skip,
      });
    }

    await cache.set(cacheKey, results, CACHE_TTL.SHORT);
    return results;
  }
}

export const searchService = new SearchService();
