import { prisma } from '../../lib/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { cache, CACHE_KEYS, CACHE_TTL } from '../../lib/redis';
import { z } from 'zod';
import { notificationsService } from '../notifications/notifications.service';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  coverUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
});

const profileSelect = {
  id: true,
  email: true,
  username: true,
  role: true,
  isVerified: true,
  createdAt: true,
  profile: {
    select: {
      displayName: true,
      bio: true,
      avatarUrl: true,
      coverUrl: true,
      website: true,
      location: true,
      twitterUrl: true,
      githubUrl: true,
      linkedinUrl: true,
    },
  },
  _count: {
    select: {
      posts: { where: { status: 'PUBLISHED' as const, deletedAt: null } },
      followers: true,
      following: true,
    },
  },
};

export class UsersService {
  async getUserProfile(username: string, requesterId?: string) {
    const cacheKey = CACHE_KEYS.user(username);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const user = await prisma.user.findFirst({
      where: { username, deletedAt: null, isActive: true },
      select: profileSelect,
    });

    if (!user) throw new NotFoundError('User not found');

    let isFollowing = false;
    if (requesterId && requesterId !== user.id) {
      const follow = await prisma.follow.findFirst({
        where: { followerId: requesterId, followingId: user.id },
      });
      isFollowing = !!follow;
    }

    const result = { ...user, isFollowing };
    await cache.set(cacheKey, result, CACHE_TTL.MEDIUM);
    return result;
  }

  async updateProfile(userId: string, data: z.infer<typeof updateProfileSchema>) {
    const profile = await prisma.profile.update({
      where: { userId },
      data: {
        ...(data.displayName && { displayName: data.displayName }),
        bio: data.bio,
        avatarUrl: data.avatarUrl || null,
        coverUrl: data.coverUrl || null,
        website: data.website || null,
        location: data.location,
        twitterUrl: data.twitterUrl || null,
        githubUrl: data.githubUrl || null,
        linkedinUrl: data.linkedinUrl || null,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
    if (user) await cache.del(CACHE_KEYS.user(user.username));

    return profile;
  }

  async followUser(followerId: string, targetUsername: string) {
    const target = await prisma.user.findFirst({
      where: { username: targetUsername, deletedAt: null },
    });
    if (!target) throw new NotFoundError('User not found');
    if (target.id === followerId) throw new ConflictError('Cannot follow yourself');

    const existing = await prisma.follow.findFirst({
      where: { followerId, followingId: target.id },
    });
    if (existing) throw new ConflictError('Already following');

    await prisma.follow.create({ data: { followerId, followingId: target.id } });

    // Invalidate both sides of the follow relationship
    await cache.del(CACHE_KEYS.user(targetUsername));
    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: { username: true },
    });
    if (follower) await cache.del(CACHE_KEYS.user(follower.username));

    // Notify the person being followed (fire-and-forget)
    notificationsService.createNotification({
      recipientId: target.id,
      triggeredBy: followerId,
      type: 'FOLLOW',
      title: 'New follower',
      message: `Someone started following you`,
      resourceId: followerId,
      resourceUrl: follower ? `/${follower.username}` : undefined,
    }).catch(() => {});

    return { following: true };
  }

  async unfollowUser(followerId: string, targetUsername: string) {
    const target = await prisma.user.findFirst({
      where: { username: targetUsername, deletedAt: null },
    });
    if (!target) throw new NotFoundError('User not found');

    const existing = await prisma.follow.findFirst({
      where: { followerId, followingId: target.id },
    });
    if (!existing) throw new NotFoundError('Not following');

    await prisma.follow.delete({ where: { id: existing.id } });

    await cache.del(CACHE_KEYS.user(targetUsername));
    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: { username: true },
    });
    if (follower) await cache.del(CACHE_KEYS.user(follower.username));

    return { following: false };
  }

  async getFollowers(username: string, page = 1, limit = 20) {
    const user = await prisma.user.findFirst({ where: { username, deletedAt: null } });
    if (!user) throw new NotFoundError('User not found');

    const skip = (page - 1) * limit;
    return prisma.follow.findMany({
      where: { followingId: user.id },
      select: {
        follower: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true, bio: true } },
          },
        },
        createdAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFollowing(username: string, page = 1, limit = 20) {
    const user = await prisma.user.findFirst({ where: { username, deletedAt: null } });
    if (!user) throw new NotFoundError('User not found');

    const skip = (page - 1) * limit;
    return prisma.follow.findMany({
      where: { followerId: user.id },
      select: {
        following: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true, bio: true } },
          },
        },
        createdAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const usersService = new UsersService();
