import { Router, Request, Response, NextFunction } from 'express';
import { searchService, searchQuerySchema } from './search.service';
import { validateQuery } from '../../middleware/validate';
import { searchRateLimiter } from '../../middleware/rateLimiter';
import { sendSuccess } from '../../utils/response';

const router = Router();

router.get(
  '/',
  searchRateLimiter,
  validateQuery(searchQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // validateQuery writes parsed values to req.query, so page/limit are already numbers.
      const { q, type, page, limit } = req.query as unknown as {
        q: string;
        type: string;
        page: number;
        limit: number;
      };
      const results = await searchService.search(q, type, page, limit);
      sendSuccess(res, results);
    } catch (err) {
      next(err);
    }
  }
);

export { router as searchRouter };
