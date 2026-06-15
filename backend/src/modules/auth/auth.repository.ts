import { User, RefreshToken } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findUserByUsername(username: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { username, deletedAt: null },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Full user profile shape for GET /auth/me.
   * Separated from findUserById so the controller layer has no direct prisma dependency.
   */
  async findCurrentUser(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
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
            posts: { where: { status: 'PUBLISHED', deletedAt: null } },
            followers: true,
            following: true,
          },
        },
      },
    });
  }

  async createUser(data: {
    email: string;
    username: string;
    passwordHash: string;
    displayName: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        profile: {
          create: {
            displayName: data.displayName,
          },
        },
      },
    });
  }

  async createRefreshToken(data: {
    userId: string;
    token: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findFirst({
      where: { token, isRevoked: false },
    });
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  async cleanExpiredTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}

export const authRepository = new AuthRepository();
