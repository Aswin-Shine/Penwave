import { Router, Request, Response, NextFunction } from 'express';
import { bookmarksService } from './bookmarks.service';
import { authenticate } from '../../middleware/auth';
import { validateQuery } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import { z } from 'zod';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

const router = Router();

router.get('/', authenticate, validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await bookmarksService.getUserBookmarks(req.user!.id, page, limit);
    sendSuccess(res, result.bookmarks, undefined, 200, result.meta);
  } catch (err) { next(err); }
});

router.post('/:postId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await bookmarksService.bookmark(req.user!.id, req.params.postId as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.delete('/:postId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await bookmarksService.removeBookmark(req.user!.id, req.params.postId as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

export { router as bookmarksRouter };
