import { Router, Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { authenticate } from '../../middleware/auth';
import { validateQuery } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import { z } from 'zod';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const router = Router();

router.get('/', authenticate, validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await notificationsService.getUserNotifications(req.user!.id, page, limit);
    sendSuccess(res, result.notifications, undefined, 200, result.meta);
  } catch (err) { next(err); }
});

router.get('/unread-count', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await notificationsService.getUnreadCount(req.user!.id);
    sendSuccess(res, { count });
  } catch (err) { next(err); }
});

router.patch('/mark-all-read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationsService.markAllAsRead(req.user!.id);
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationsService.markAsRead(req.params.id as string, req.user!.id);
    sendSuccess(res, null, 'Marked as read');
  } catch (err) { next(err); }
});

export { router as notificationsRouter };
