import { prisma } from '../../lib/prisma';

export class AnalyticsService {
  async getDashboardStats(userId: string) {
    const [totalPosts, totalViews, totalLikes, totalComments, totalFollowers] = await Promise.all([
      prisma.post.count({ where: { authorId: userId, status: 'PUBLISHED', deletedAt: null } }),
      prisma.post.aggregate({
        where: { authorId: userId, deletedAt: null },
        _sum: { viewCount: true },
      }),
      prisma.post.aggregate({
        where: { authorId: userId, deletedAt: null },
        _sum: { likeCount: true },
      }),
      prisma.post.aggregate({
        where: { authorId: userId, deletedAt: null },
        _sum: { commentCount: true },
      }),
      prisma.follow.count({ where: { followingId: userId } }),
    ]);

    return {
      totalPosts,
      totalViews: totalViews._sum.viewCount ?? 0,
      totalLikes: totalLikes._sum.likeCount ?? 0,
      totalComments: totalComments._sum.commentCount ?? 0,
      totalFollowers,
    };
  }

  async getPostAnalytics(postId: string, userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const post = await prisma.post.findFirst({
      where: { id: postId, authorId: userId, deletedAt: null },
    });
    if (!post) return null;

    const analytics = await prisma.postAnalytic.findMany({
      where: {
        postId,
        date: { gte: since },
      },
      orderBy: { date: 'asc' },
    });

    return { post, analytics };
  }

  async getTopPosts(userId: string, limit = 5) {
    return prisma.post.findMany({
      where: { authorId: userId, status: 'PUBLISHED', deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        publishedAt: true,
      },
      orderBy: { viewCount: 'desc' },
      take: limit,
    });
  }
}

export const analyticsService = new AnalyticsService();
