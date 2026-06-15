import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken, ACCESS_COOKIE } from '../lib/jwt';
import { UnauthorizedError, ForbiddenError } from '../shared/errors';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    // Try cookie first, then Authorization header
    const token =
      req.cookies?.[ACCESS_COOKIE] ??
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role as Role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token =
      req.cookies?.[ACCESS_COOKIE] ??
      req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const payload = verifyAccessToken(token);
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role as Role,
      };
    }
  } catch {
    // Silently ignore — this is optional auth
  }
  next();
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }
    next();
  };
}

export function requireOwnerOrAdmin(userIdGetter: (req: Request) => string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    const targetUserId = userIdGetter(req);
    if (req.user.id !== targetUserId && req.user.role !== Role.ADMIN) {
      next(new ForbiddenError('Access denied'));
      return;
    }
    next();
  };
}
