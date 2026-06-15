import { Request, Response, NextFunction } from 'express';
import { postsService } from './posts.service';
import { sendSuccess, sendCreated, PaginationMeta } from '../../utils/response';
import { ListPostsQuery } from './posts.dto';

// Read the validated + coerced query written by validateQuery middleware.
function getValidatedQuery(req: Request): ListPostsQuery {
  return ((req as Request & { validatedQuery?: ListPostsQuery }).validatedQuery ??
    req.query) as ListPostsQuery;
}

// Express params are always plain strings at runtime — this cast is safe.
function param(req: Request, key: string): string {
  return req.params[key] as string;
}

export class PostsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await postsService.getPublishedPosts(getValidatedQuery(req));
      const { posts, meta } = result as { posts: unknown[]; meta: PaginationMeta };
      sendSuccess(res, posts, undefined, 200, meta);
    } catch (error) {
      next(error);
    }
  }

  async trending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const posts = await postsService.getTrendingPosts();
      sendSuccess(res, posts);
    } catch (error) {
      next(error);
    }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const post = await postsService.getPostBySlug(param(req, 'slug'), req.user?.id);
      sendSuccess(res, post);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const post = await postsService.createPost(req.user!.id, req.body);
      sendCreated(res, post, 'Post created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const post = await postsService.updatePost(param(req, 'id'), req.user!.id, req.body);
      sendSuccess(res, post, 'Post updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await postsService.deletePost(param(req, 'id'), req.user!.id, req.user!.role === 'ADMIN');
      sendSuccess(res, null, 'Post deleted');
    } catch (error) {
      next(error);
    }
  }

  async myDrafts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const drafts = await postsService.getUserDrafts(req.user!.id);
      sendSuccess(res, drafts);
    } catch (error) {
      next(error);
    }
  }

  async getUserPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await postsService.getUserPosts(
        param(req, 'username'),
        getValidatedQuery(req),
        req.user?.id,
      );
      const { posts, meta } = result as { posts: unknown[]; meta: PaginationMeta };
      sendSuccess(res, posts, undefined, 200, meta);
    } catch (error) {
      next(error);
    }
  }

  async getForEdit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const post = await postsService.getPostForEdit(param(req, 'id'), req.user!.id);
      sendSuccess(res, post);
    } catch (error) {
      next(error);
    }
  }
}

export const postsController = new PostsController();
