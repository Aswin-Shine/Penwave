import { prisma } from '../../lib/prisma';
import { NotFoundError, ForbiddenError } from '../../shared/errors';
import { z } from 'zod';
import { sanitizeHtml } from '../../lib/sanitize';
import { notificationsService } from '../notifications/notifications.service';

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
  parentId: z.string().uuid().optional(),
});

export const updateCommentSchema = z.object({ content: z.string().min(1).max(2000).trim() });

// Replies capped at 50 per comment to prevent unbounded payloads
const commentSelect = {
  id: true, content: true, isEdited: true, likeCount: true, parentId: true, createdAt: true, updatedAt: true,
  author: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
  replies: {
    where: { deletedAt: null },
    select: { id: true, content: true, isEdited: true, likeCount: true, parentId: true, createdAt: true, updatedAt: true, author: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
    orderBy: { createdAt: 'asc' as const },
    take: 50,
  },
};

export class CommentsService {
  async getPostComments(postId: string, page = 1, limit = 20) {
    const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) throw new NotFoundError('Post not found');
    const skip = (page - 1) * limit;
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId, parentId: null, deletedAt: null },
        select: commentSelect,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where: { postId, parentId: null, deletedAt: null } }),
    ]);
    return { comments, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createComment(postId: string, authorId: string, content: string, parentId?: string) {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null, allowComments: true },
      select: { id: true, slug: true, title: true, authorId: true },
    });
    if (!post) throw new NotFoundError('Post not found or comments disabled');

    if (parentId) {
      const parent = await prisma.comment.findFirst({ where: { id: parentId, postId, deletedAt: null } });
      if (!parent) throw new NotFoundError('Parent comment not found');
    }

    const comment = await prisma.comment.create({
      data: { postId, authorId, content: sanitizeHtml(content), parentId },
      select: commentSelect,
    });
    await prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });

    // Notify post author (skip if they're commenting on their own post)
    if (post.authorId !== authorId) {
      notificationsService.createNotification({
        recipientId: post.authorId,
        triggeredBy: authorId,
        type: 'COMMENT',
        title: 'New comment on your post',
        message: `Someone commented on "${post.title}"`,
        resourceId: post.id,
        resourceUrl: `/post/${post.slug}`,
      }).catch(() => {});
    }

    // If this is a reply, also notify the parent comment author
    if (parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: parentId },
        select: { authorId: true },
      });
      if (parent && parent.authorId !== authorId && parent.authorId !== post.authorId) {
        notificationsService.createNotification({
          recipientId: parent.authorId,
          triggeredBy: authorId,
          type: 'REPLY',
          title: 'New reply to your comment',
          message: `Someone replied to your comment on "${post.title}"`,
          resourceId: post.id,
          resourceUrl: `/post/${post.slug}`,
        }).catch(() => {});
      }
    }

    return comment;
  }

  async updateComment(commentId: string, requesterId: string, content: string) {
    const comment = await prisma.comment.findFirst({ where: { id: commentId, deletedAt: null } });
    if (!comment) throw new NotFoundError('Comment not found');
    if (comment.authorId !== requesterId) throw new ForbiddenError();
    return prisma.comment.update({
      where: { id: commentId },
      data: { content: sanitizeHtml(content), isEdited: true },
      select: commentSelect,
    });
  }

  async deleteComment(commentId: string, requesterId: string, isAdmin: boolean) {
    const comment = await prisma.comment.findFirst({ where: { id: commentId, deletedAt: null } });
    if (!comment) throw new NotFoundError('Comment not found');
    if (comment.authorId !== requesterId && !isAdmin) throw new ForbiddenError();

    // Count how many non-deleted replies this comment has so we can decrement
    // commentCount correctly — deleting a parent must account for all its children.
    const replyCount = await prisma.comment.count({
      where: { parentId: commentId, deletedAt: null },
    });

    await prisma.$transaction([
      prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } }),
      prisma.post.update({
        where: { id: comment.postId },
        // Decrement by 1 (the comment itself) + all its live replies
        data: { commentCount: { decrement: 1 + replyCount } },
      }),
    ]);
  }
}

export const commentsService = new CommentsService();
