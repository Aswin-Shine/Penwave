import { prisma } from '../../lib/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { paginate } from '../../utils/response';
import { notificationsService } from '../notifications/notifications.service';

export class BookmarksService {
  async bookmark(userId: string, postId: string) {
    const post = await prisma.post.findFirst({
      where: { id: postId, status: 'PUBLISHED', deletedAt: null },
      select: { id: true, slug: true, title: true, authorId: true },
    });
    if (!post) throw new NotFoundError('Post not found');

    const existing = await prisma.bookmark.findFirst({ where: { userId, postId } });
    if (existing) throw new ConflictError('Already bookmarked');

    await prisma.$transaction([
      prisma.bookmark.create({ data: { userId, postId } }),
      prisma.post.update({ where: { id: postId }, data: { bookmarkCount: { increment: 1 } } }),
    ]);

    // Notify post author (fire-and-forget)
    notificationsService.createNotification({
      recipientId: post.authorId,
      triggeredBy: userId,
      type: 'BOOKMARK',
      title: 'Someone bookmarked your post',
      message: `Your post "${post.title}" was bookmarked`,
      resourceId: post.id,
      resourceUrl: `/post/${post.slug}`,
    }).catch(() => {});

    return { bookmarked: true };
  }

  async removeBookmark(userId: string, postId: string) {
    const existing = await prisma.bookmark.findFirst({ where: { userId, postId } });
    if (!existing) throw new NotFoundError('Bookmark not found');

    await prisma.$transaction([
      prisma.bookmark.delete({ where: { id: existing.id } }),
      prisma.post.updateMany({
        where: { id: postId, deletedAt: null },
        data: { bookmarkCount: { decrement: 1 } },
      }),
    ]);

    return { bookmarked: false };
  }

  async getUserBookmarks(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where: {
          userId,
          post: { deletedAt: null },
        },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              coverImage: true,
              status: true,
              publishedAt: true,
              createdAt: true,
              readingTime: true,
              likeCount: true,
              commentCount: true,
              author: {
                select: {
                  username: true,
                  profile: { select: { displayName: true, avatarUrl: true } },
                },
              },
              tags: {
                select: { tag: { select: { id: true, name: true, slug: true, color: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bookmark.count({
        where: { userId, post: { deletedAt: null } },
      }),
    ]);

    return {
      bookmarks: bookmarks.filter((b) => b.post !== null),
      meta: paginate(page, limit, total),
    };
  }

  async isBookmarked(userId: string, postId: string): Promise<boolean> {
    const b = await prisma.bookmark.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    });
    return !!b;
  }
}

export const bookmarksService = new BookmarksService();
