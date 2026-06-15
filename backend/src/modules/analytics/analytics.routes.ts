import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { authenticate } from '../../middleware/auth';
import { validateQuery } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import { z } from 'zod';

const daysSchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
});

const router = Router();

router.get('/dashboard', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await analyticsService.getDashboardStats(req.user!.id);
    sendSuccess(res, stats);
  } catch (err) { next(err); }
});

router.get('/top-posts', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const posts = await analyticsService.getTopPosts(req.user!.id);
    sendSuccess(res, posts);
  } catch (err) { next(err); }
});

router.get('/posts/:postId', authenticate, validateQuery(daysSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Number(req.query.days) || 30;
    const data = await analyticsService.getPostAnalytics(req.params.postId as string, req.user!.id, days);
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

export { router as analyticsRouter };
