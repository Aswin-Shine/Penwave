import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { signupSchema, loginSchema } from './auth.dto';

const router = Router();

router.post('/signup', authRateLimiter, validateBody(signupSchema), (req, res, next) =>
  authController.signup(req, res, next)
);

router.post('/login', authRateLimiter, validateBody(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

router.post('/refresh', (req, res, next) =>
  authController.refresh(req, res, next)
);

router.post('/logout', (req, res, next) =>
  authController.logout(req, res, next)
);

router.post('/logout-all', authenticate, (req, res, next) =>
  authController.logoutAll(req, res, next)
);

router.get('/me', authenticate, (req, res, next) =>
  authController.me(req, res, next)
);

export { router as authRouter };
