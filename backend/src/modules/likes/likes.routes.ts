import { Router, Request, Response, NextFunction } from 'express';
import { likesService } from './likes.service';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';

const router = Router({ mergeParams: true });

// POST /api/posts/:postId/likes
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await likesService.likePost(req.user!.id, req.params.postId as string);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:postId/likes
router.delete('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await likesService.unlikePost(req.user!.id, req.params.postId as string);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

export { router as likesRouter };
