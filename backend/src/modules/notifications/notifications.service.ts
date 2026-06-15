import { NotificationType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { paginate } from '../../utils/response';

export class NotificationsService {
  async createNotification(data: {
    recipientId: string;
    triggeredBy: string;
    type: NotificationType;
    title: string;
    message: string;
    resourceId?: string;
    resourceUrl?: string;
  }) {
    // Don't notify yourself
    if (data.recipientId === data.triggeredBy) return;

    return prisma.notification.create({ data });
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: userId },
        include: {
          trigger: {
            select: {
              username: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { recipientId: userId } }),
    ]);

    return { notifications, meta: paginate(page, limit, total) };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { recipientId: userId, isRead: false } });
  }

  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, recipientId: userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  }
}

export const notificationsService = new NotificationsService();
