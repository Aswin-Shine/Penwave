import { Router, Request, Response, NextFunction } from 'express';
import { commentsService, createCommentSchema, updateCommentSchema } from './comments.service';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { sendSuccess, sendCreated } from '../../utils/response';

const router = Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const result = await commentsService.getPostComments(req.params.postId as string, page, limit);
    sendSuccess(res, result.comments, undefined, 200, {
      page: result.page, limit: result.limit, total: result.total,
      totalPages: result.totalPages, hasNext: result.page < result.totalPages, hasPrev: result.page > 1,
    });
  } catch (err) { next(err); }
});

router.post('/', authenticate, validateBody(createCommentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await commentsService.createComment(req.params.postId as string, req.user!.id, req.body.content, req.body.parentId);
    sendCreated(res, comment, 'Comment added');
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, validateBody(updateCommentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await commentsService.updateComment(req.params.id as string, req.user!.id, req.body.content);
    sendSuccess(res, comment, 'Comment updated');
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await commentsService.deleteComment(req.params.id as string, req.user!.id, req.user!.role === 'ADMIN');
    sendSuccess(res, null, 'Comment deleted');
  } catch (err) { next(err); }
});

export { router as commentsRouter };
