import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { authRepository } from './auth.repository';
import { COOKIE_OPTIONS, ACCESS_COOKIE, REFRESH_COOKIE } from '../../lib/jwt';
import { sendSuccess, sendCreated } from '../../utils/response';
import { UnauthorizedError } from '../../shared/errors';

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;

function setCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, { ...COOKIE_OPTIONS, maxAge: ACCESS_COOKIE_MAX_AGE });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...COOKIE_OPTIONS, maxAge: REFRESH_COOKIE_MAX_AGE, path: '/api/auth/refresh' });
}

function clearCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, COOKIE_OPTIONS);
  res.clearCookie(REFRESH_COOKIE, { ...COOKIE_OPTIONS, path: '/api/auth/refresh' });
}

export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await authService.signup(req.body, req.headers['user-agent'], req.ip);
      setCookies(res, tokens.accessToken, tokens.refreshToken);
      sendCreated(res, { user }, 'Account created successfully');
    } catch (error) { next(error); }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await authService.login(req.body, req.headers['user-agent'], req.ip);
      setCookies(res, tokens.accessToken, tokens.refreshToken);
      sendSuccess(res, { user }, 'Logged in successfully');
    } catch (error) { next(error); }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Refresh token must come from the httpOnly cookie only.
      // Removed req.body fallback — accepting tokens from the body partially defeats
      // the httpOnly cookie model and widens the XSS attack surface.
      const refreshToken = req.cookies?.[REFRESH_COOKIE];
      if (!refreshToken) throw new UnauthorizedError('Refresh token required');
      const tokens = await authService.refresh(refreshToken, req.headers['user-agent'], req.ip);
      setCookies(res, tokens.accessToken, tokens.refreshToken);
      sendSuccess(res, null, 'Token refreshed');
    } catch (error) { next(error); }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE];
      if (refreshToken) await authService.logout(refreshToken);
      clearCookies(res);
      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) { next(error); }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      await authService.logoutAll(req.user.id);
      clearCookies(res);
      sendSuccess(res, null, 'Logged out from all devices');
    } catch (error) { next(error); }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      // Delegate DB access to the repository layer — controllers should not import prisma directly.
      const user = await authRepository.findCurrentUser(req.user.id);
      sendSuccess(res, user);
    } catch (error) { next(error); }
  }
}

export const authController = new AuthController();
