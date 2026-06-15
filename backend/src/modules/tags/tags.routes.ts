import { Router, Request, Response, NextFunction } from 'express';
import { tagsService } from './tags.service';
import { sendSuccess } from '../../utils/response';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await tagsService.getAllTags();
    sendSuccess(res, tags);
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tag = await tagsService.getTagBySlug(req.params.slug as string);
    if (!tag) {
      res.status(404).json({ success: false, message: 'Tag not found' });
      return;
    }
    sendSuccess(res, tag);
  } catch (err) {
    next(err);
  }
});

export { router as tagsRouter };
