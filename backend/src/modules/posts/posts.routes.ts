import { Request, Router } from 'express';
import { postsController } from './posts.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { createPostSchema, updatePostSchema, listPostsQuerySchema } from './posts.dto';

const router = Router();

router.get('/', validateQuery(listPostsQuerySchema), (req: Request, res, next) => {
  postsController.list(req, res, next);
});

router.get('/trending', (req, res, next) =>
  postsController.trending(req, res, next)
);

router.get('/me/drafts', authenticate, (req, res, next) =>
  postsController.myDrafts(req, res, next)
);

router.get('/user/:username', optionalAuth, validateQuery(listPostsQuerySchema), (req, res, next) =>
  postsController.getUserPosts(req, res, next)
);

router.get('/edit/:id', authenticate, (req, res, next) =>
  postsController.getForEdit(req, res, next)
);

router.get('/:slug', optionalAuth, (req, res, next) =>
  postsController.getBySlug(req, res, next)
);

router.post('/', authenticate, validateBody(createPostSchema), (req, res, next) =>
  postsController.create(req, res, next)
);

router.patch('/:id', authenticate, validateBody(updatePostSchema), (req, res, next) =>
  postsController.update(req, res, next)
);

router.delete('/:id', authenticate, (req, res, next) =>
  postsController.delete(req, res, next)
);

export { router as postsRouter };
