import { hash as argon2Hash, verify as argon2Verify, Algorithm } from '@node-rs/argon2';
import { v4 as uuidv4 } from 'uuid';
import ms from 'ms';
import { authRepository } from './auth.repository';
import { SignupDto, LoginDto } from './auth.dto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { ConflictError, UnauthorizedError } from '../../shared/errors';
import { logger } from '../../lib/logger';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';

export interface AuthTokens { accessToken: string; refreshToken: string; }
export interface AuthUser {
  id: string; email: string; username: string; role: string;
  profile: { displayName: string; avatarUrl: string | null } | null;
}

export class AuthService {
  async signup(dto: SignupDto, userAgent?: string, ipAddress?: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const existingEmail = await authRepository.findUserByEmail(dto.email);
    if (existingEmail) throw new ConflictError('An account with this email already exists');
    const existingUsername = await authRepository.findUserByUsername(dto.username);
    if (existingUsername) throw new ConflictError('This username is already taken');
    const passwordHash = await argon2Hash(dto.password, { algorithm: Algorithm.Argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });
    const user = await authRepository.createUser({ email: dto.email, username: dto.username, passwordHash, displayName: dto.displayName });
    const tokens = await this.generateTokens(user.id, user.email, user.role, userAgent, ipAddress);
    logger.info({ event: 'user.signup', userId: user.id, email: user.email });
    return { user: { id: user.id, email: user.email, username: user.username, role: user.role, profile: { displayName: dto.displayName, avatarUrl: null } }, tokens };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const user = await authRepository.findUserByEmail(dto.email);
    if (!user) { await argon2Hash('dummy-password-to-prevent-timing-attack'); throw new UnauthorizedError('Invalid credentials'); }
    if (!user.isActive) throw new UnauthorizedError('Account is deactivated');
    const isValidPassword = await argon2Verify(user.passwordHash, dto.password);
    if (!isValidPassword) { logger.warn({ event: 'auth.login.failed', email: dto.email, ip: ipAddress }); throw new UnauthorizedError('Invalid credentials'); }
    const tokens = await this.generateTokens(user.id, user.email, user.role, userAgent, ipAddress);
    logger.info({ event: 'user.login', userId: user.id });
    const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    return { user: { id: user.id, email: user.email, username: user.username, role: user.role, profile: profile ? { displayName: profile.displayName, avatarUrl: profile.avatarUrl } : null }, tokens };
  }

  /**
   * Refresh token rotation — wrapped in a Prisma transaction to prevent the
   * concurrency race where two simultaneous requests both pass the isRevoked
   * check before either completes the revocation.
   *
   * The transaction serialises: verify → check-revoked → revoke → create-new.
   * A second concurrent request will block on the UPDATE row lock and then
   * read isRevoked = true, triggering the full-session revocation path.
   */
  async refresh(refreshToken: string, userAgent?: string, ipAddress?: string): Promise<AuthTokens> {
    // Verify JWT signature first (cheap, no DB) — bail early on forgeries
    const payload = verifyRefreshToken(refreshToken);

    return prisma.$transaction(async (tx) => {
      // Lock the row with a raw query to ensure serialised access
      const storedTokens = await tx.$queryRaw<Array<{
        id: string; userId: string; isRevoked: boolean; expiresAt: Date;
      }>>`
        SELECT id, "userId", "isRevoked", "expiresAt"
        FROM refresh_tokens
        WHERE token = ${refreshToken}
        LIMIT 1
        FOR UPDATE
      `;

      const storedToken = storedTokens[0];

      if (!storedToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (storedToken.isRevoked) {
        // Token reuse detected — revoke ALL tokens for this user (full session kill)
        await tx.refreshToken.updateMany({
          where: { userId: storedToken.userId },
          data: { isRevoked: true },
        });
        logger.warn({ event: 'auth.token.reuse', userId: storedToken.userId });
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (storedToken.expiresAt < new Date()) {
        await tx.refreshToken.update({
          where: { id: storedToken.id },
          data: { isRevoked: true },
        });
        throw new UnauthorizedError('Refresh token expired');
      }

      const user = await tx.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
      });
      if (!user || !user.isActive) throw new UnauthorizedError('User not found');

      // Revoke the used token inside the transaction
      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });

      // Create the new token pair inside the same transaction
      const tokenId = uuidv4();
      const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
      const newRefreshToken = signRefreshToken({ sub: user.id, tokenId });
      const expiresAt = new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN));

      await tx.refreshToken.create({
        data: { userId: user.id, token: newRefreshToken, expiresAt, userAgent, ipAddress },
      });

      return { accessToken, refreshToken: newRefreshToken };
    });
  }

  async logout(refreshToken: string): Promise<void> {
    if (refreshToken) await authRepository.revokeRefreshToken(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await authRepository.revokeAllUserRefreshTokens(userId);
    logger.info({ event: 'user.logout.all', userId });
  }

  async cleanExpiredTokens(): Promise<void> {
    await authRepository.cleanExpiredTokens();
    logger.info({ event: 'auth.tokens.cleaned' });
  }

  private async generateTokens(userId: string, email: string, role: string, userAgent?: string, ipAddress?: string): Promise<AuthTokens> {
    const tokenId = uuidv4();
    const accessToken = signAccessToken({ sub: userId, email, role });
    const refreshToken = signRefreshToken({ sub: userId, tokenId });
    const expiresAt = new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN));
    await authRepository.createRefreshToken({ userId, token: refreshToken, expiresAt, userAgent, ipAddress });
    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
