import slugify from 'slugify';
import { prisma } from '../../lib/prisma';
import { cache, CACHE_KEYS, CACHE_TTL } from '../../lib/redis';

export class TagsService {
  /**
   * Upsert tags in parallel and return their IDs.
   * Previously serial (one await per tag); now batched with Promise.all.
   */
  async resolveTagIds(tagNames: string[]): Promise<string[]> {
    if (tagNames.length === 0) return [];

    const results = await Promise.all(
      tagNames.map((name) => {
        const slug = slugify(name, { lower: true, strict: true });
        return prisma.tag.upsert({
          where: { slug },
          update: {},
          create: { name: name.trim(), slug },
          select: { id: true },
        });
      })
    );

    return results.map((t) => t.id);
  }

  /**
   * Increment postCount for all given tag IDs atomically.
   * Called by PostsService.createPost when a post is published,
   * and on publish-on-update transitions.
   */
  async incrementPostCounts(tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;
    await prisma.tag.updateMany({
      where: { id: { in: tagIds } },
      data: { postCount: { increment: 1 } },
    });
    await cache.del(CACHE_KEYS.tags());
  }

  /**
   * Decrement postCount for all given tag IDs (floor at 0).
   * Called by PostsService when a published post is deleted or unpublished.
   */
  async decrementPostCounts(tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;
    // Use raw update to avoid negative counts under race conditions
    await prisma.$executeRaw`
      UPDATE tags
      SET "postCount" = GREATEST(0, "postCount" - 1)
      WHERE id = ANY(${tagIds}::uuid[])
    `;
    await cache.del(CACHE_KEYS.tags());
  }

  async getAllTags() {
    const cached = await cache.get(CACHE_KEYS.tags());
    if (cached) return cached;

    const tags = await prisma.tag.findMany({
      orderBy: { postCount: 'desc' },
      take: 50,
    });

    await cache.set(CACHE_KEYS.tags(), tags, CACHE_TTL.HOUR);
    return tags;
  }

  async getTagBySlug(slug: string) {
    return prisma.tag.findUnique({ where: { slug } });
  }
}

export const tagsService = new TagsService();
