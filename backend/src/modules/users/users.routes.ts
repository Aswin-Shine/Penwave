import { Router, Request, Response, NextFunction } from 'express';
import { usersService, updateProfileSchema } from './users.service';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import { z } from 'zod';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const router = Router();

router.patch('/profile', authenticate, validateBody(updateProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await usersService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, profile, 'Profile updated');
  } catch (err) { next(err); }
});

router.get('/:username', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await usersService.getUserProfile(req.params.username as string, req.user?.id);
    sendSuccess(res, user);
  } catch (err) { next(err); }
});

router.post('/:username/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await usersService.followUser(req.user!.id, req.params.username as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.delete('/:username/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await usersService.unfollowUser(req.user!.id, req.params.username as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// Previously page/limit were never passed — getFollowers/getFollowing always got page=1, limit=20
router.get('/:username/followers', validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const followers = await usersService.getFollowers(req.params.username as string, page, limit);
    sendSuccess(res, followers);
  } catch (err) { next(err); }
});

router.get('/:username/following', validateQuery(paginationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const following = await usersService.getFollowing(req.params.username as string, page, limit);
    sendSuccess(res, following);
  } catch (err) { next(err); }
});

export { router as usersRouter };
