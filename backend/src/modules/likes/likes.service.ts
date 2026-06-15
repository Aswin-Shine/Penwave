import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../shared/errors';
import { cache, CACHE_KEYS } from '../../lib/redis';
import { notificationsService } from '../notifications/notifications.service';

export class LikesService {
  async likePost(userId: string, postId: string) {
    const post = await prisma.post.findFirst({
      where: { id: postId, status: 'PUBLISHED', deletedAt: null },
      select: { id: true, slug: true, title: true, authorId: true },
    });
    if (!post) throw new NotFoundError('Post not found');

    try {
      await prisma.$transaction([
        prisma.like.create({ data: { userId, postId } }),
        prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
      ]);

      // Notify post author (fire-and-forget, don't block the response)
      notificationsService.createNotification({
        recipientId: post.authorId,
        triggeredBy: userId,
        type: 'LIKE',
        title: 'Someone liked your post',
        message: `Your post "${post.title}" received a new like`,
        resourceId: post.id,
        resourceUrl: `/post/${post.slug}`,
      }).catch(() => {});
    } catch (e: unknown) {
      // P2002 = unique constraint violation — already liked, treat as idempotent
      if ((e as { code?: string }).code !== 'P2002') throw e;
    }

    await cache.del(CACHE_KEYS.post(post.slug));
    return { liked: true };
  }

  async unlikePost(userId: string, postId: string) {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, slug: true },
    });
    if (!post) throw new NotFoundError('Post not found');

    const existing = await prisma.like.findFirst({ where: { userId, postId }, select: { id: true } });
    if (existing) {
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existing.id } }),
        prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
      ]);
    }

    await cache.del(CACHE_KEYS.post(post.slug));
    return { liked: false };
  }

  async isPostLiked(userId: string, postId: string): Promise<boolean> {
    const like = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    });
    return !!like;
  }

  async getUserLikedPosts(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [likes, total] = await Promise.all([
      prisma.like.findMany({
        where: { userId, postId: { not: null } },
        include: { post: { select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, publishedAt: true, readingTime: true, likeCount: true, author: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } } } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.like.count({ where: { userId, postId: { not: null } } }),
    ]);
    return { likes: likes.filter((l) => l.post), total };
  }
}

export const likesService = new LikesService();
