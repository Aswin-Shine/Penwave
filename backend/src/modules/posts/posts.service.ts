import slugify from 'slugify';
import { PostStatus } from '@prisma/client';
import { postsRepository } from './posts.repository';
import { CreatePostDto, UpdatePostDto, ListPostsQuery } from './posts.dto';
import { tagsService } from '../tags/tags.service';
import { notificationsService } from '../notifications/notifications.service';
import { cache, CACHE_KEYS, CACHE_TTL } from '../../lib/redis';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../shared/errors';
import { paginate } from '../../utils/response';
import { prisma } from '../../lib/prisma';
import { sanitizeHtml } from '../../lib/sanitize';

function calculateReadingTime(content: string): number {
  const wordCount = content.trim().split(/\s+/).length;
  return Math.ceil(wordCount / 200);
}

async function generateUniqueSlug(title: string): Promise<string> {
  let slug = slugify(title, { lower: true, strict: true, trim: true });
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await postsRepository.findBySlug(candidate);
    if (!existing) return candidate;
    attempt++;
    if (attempt > 100) throw new BadRequestError('Could not generate unique slug');
  }
}

export class PostsService {
  async getPublishedPosts(query: ListPostsQuery) {
    const cacheKey = CACHE_KEYS.postList(query.page, query.limit, query.tag, query.sort);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const { posts, total } = await postsRepository.findMany({
      page: query.page, limit: query.limit, status: 'PUBLISHED',
      tagSlug: query.tag, sort: query.sort, search: query.search,
    });

    const result = { posts, meta: paginate(query.page, query.limit, total) };
    await cache.set(cacheKey, result, CACHE_TTL.MEDIUM);
    return result;
  }

  async getPostBySlug(slug: string, viewerId?: string) {
    const cacheKey = CACHE_KEYS.post(slug);
    let post = await cache.get<Record<string, unknown>>(cacheKey);

    if (!post) {
      const dbPost = await postsRepository.findBySlug(slug, true);
      if (!dbPost || dbPost.status !== 'PUBLISHED') throw new NotFoundError('Post not found');
      await postsRepository.incrementViewCount(dbPost.id);
      const refreshed = await postsRepository.findBySlug(slug, true);
      post = refreshed as unknown as Record<string, unknown>;
      await cache.set(cacheKey, post, CACHE_TTL.MEDIUM);
    }

    if (viewerId && post) {
      const postId = post.id as string;
      prisma.viewHistory.upsert({
        where: { userId_postId: { userId: viewerId, postId } },
        update: { viewedAt: new Date() },
        create: { userId: viewerId, postId },
      }).catch(() => {});
    }

    if (viewerId && post) {
      const postId = post.id as string;
      const [likeRow, bookmarkRow] = await Promise.all([
        prisma.like.findFirst({ where: { userId: viewerId, postId }, select: { id: true } }),
        prisma.bookmark.findFirst({ where: { userId: viewerId, postId }, select: { id: true } }),
      ]);
      return { ...post, isLiked: !!likeRow, isBookmarked: !!bookmarkRow };
    }

    return { ...(post as object), isLiked: false, isBookmarked: false };
  }

  async getPostForEdit(postId: string, requesterId: string) {
    const post = await postsRepository.findById(postId);
    if (!post) throw new NotFoundError('Post not found');
    if (post.author.id !== requesterId) throw new ForbiddenError();
    return post;
  }

  async createPost(authorId: string, dto: CreatePostDto) {
    const slug = await generateUniqueSlug(dto.title);
    const readingTime = calculateReadingTime(dto.content);
    const tagIds = await tagsService.resolveTagIds(dto.tags);
    const isPublished = dto.status === 'PUBLISHED';
    const publishedAt = isPublished ? new Date() : undefined;
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;

    const safeContent = sanitizeHtml(dto.content);
    const rawExcerpt = dto.excerpt ?? safeContent.substring(0, 200).replace(/<[^>]+>/g, '');
    const safeExcerpt = sanitizeHtml(rawExcerpt);

    const post = await postsRepository.create({
      authorId, title: dto.title, slug,
      content: safeContent, contentJson: dto.contentJson, excerpt: safeExcerpt,
      coverImage: dto.coverImage || undefined,
      status: dto.status as PostStatus, publishedAt, scheduledAt, readingTime,
      metaTitle: dto.metaTitle, metaDescription: dto.metaDescription,
      allowComments: dto.allowComments, tags: tagIds,
    });

    // Increment tag postCounts when post is published immediately
    if (isPublished && tagIds.length > 0) {
      await tagsService.incrementPostCounts(tagIds).catch(() => {});
    }

    await this._invalidatePostListCache();
    return post;
  }

  async updatePost(postId: string, requesterId: string, dto: UpdatePostDto) {
    const existing = await postsRepository.findById(postId);
    if (!existing) throw new NotFoundError('Post not found');
    if (existing.author.id !== requesterId) throw new ForbiddenError();

    const updates: Parameters<typeof postsRepository.update>[1] = {};

    if (dto.title) {
      updates.title = dto.title;
      if (existing.status === 'DRAFT') updates.slug = await generateUniqueSlug(dto.title);
    }
    if (dto.content) {
      updates.content = sanitizeHtml(dto.content);
      updates.readingTime = calculateReadingTime(dto.content);
    }
    if (dto.contentJson) updates.contentJson = dto.contentJson;
    if (dto.excerpt !== undefined) updates.excerpt = dto.excerpt ? sanitizeHtml(dto.excerpt) : dto.excerpt;
    if (dto.coverImage !== undefined) updates.coverImage = dto.coverImage || undefined;
    if (dto.metaTitle !== undefined) updates.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) updates.metaDescription = dto.metaDescription;
    if (dto.allowComments !== undefined) updates.allowComments = dto.allowComments;

    // Track whether this update transitions the post to PUBLISHED
    const isBeingPublished = dto.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';
    if (dto.status) {
      updates.status = dto.status as PostStatus;
      if (isBeingPublished) updates.publishedAt = new Date();
    }

    let newTagIds: string[] | undefined;
    if (dto.tags !== undefined) {
      newTagIds = await tagsService.resolveTagIds(dto.tags);
      updates.tags = newTagIds;
    }

    const post = await postsRepository.update(postId, updates);

    // Update tag postCounts when post transitions to published
    if (isBeingPublished) {
      const tagIds = newTagIds ?? existing.tags.map((t: { tag: { id: string } }) => t.tag.id);
      if (tagIds.length > 0) {
        await tagsService.incrementPostCounts(tagIds).catch(() => {});
      }
    }

    await cache.del(CACHE_KEYS.post(existing.slug ?? ''));
    await this._invalidatePostListCache();
    return post;
  }

  async deletePost(postId: string, requesterId: string, isAdmin: boolean) {
    const existing = await postsRepository.findById(postId);
    if (!existing) throw new NotFoundError('Post not found');
    if (existing.author.id !== requesterId && !isAdmin) throw new ForbiddenError();

    // Decrement tag postCounts if post was published
    if (existing.status === 'PUBLISHED') {
      const tagIds = existing.tags.map((t: { tag: { id: string } }) => t.tag.id);
      if (tagIds.length > 0) {
        await tagsService.decrementPostCounts(tagIds).catch(() => {});
      }
    }

    await postsRepository.softDelete(postId);
    await cache.del(CACHE_KEYS.post(existing.slug ?? ''));
    await this._invalidatePostListCache();
  }

  async getTrendingPosts() {
    const cacheKey = CACHE_KEYS.trending();
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
    const posts = await postsRepository.getTrending(10);
    await cache.set(cacheKey, posts, CACHE_TTL.MEDIUM);
    return posts;
  }

  async getUserPosts(username: string, query: ListPostsQuery, requesterId?: string) {
    const user = await prisma.user.findFirst({ where: { username, deletedAt: null } });
    if (!user) throw new NotFoundError('User not found');
    const isOwner = requesterId === user.id;
    const statusFilter: PostStatus = isOwner && query.status ? (query.status as PostStatus) : 'PUBLISHED';
    const { posts, total } = await postsRepository.findMany({
      page: query.page, limit: query.limit, authorId: user.id, status: statusFilter, sort: query.sort,
    });
    return { posts, meta: paginate(query.page, query.limit, total) };
  }

  async getUserDrafts(userId: string) { return postsRepository.getUserDrafts(userId); }

  /**
   * Batch-update all due scheduled posts in a single query instead of a serial loop.
   */
  async publishScheduledPosts() {
    const scheduled = await postsRepository.getScheduledPosts();
    if (scheduled.length === 0) return 0;

    const ids = scheduled.map((p) => p.id);
    await prisma.post.updateMany({
      where: { id: { in: ids } },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    // Increment tag counts for newly published posts
    const tagIds = scheduled.flatMap((p) =>
      (p.tags as Array<{ tag: { id: string } }>).map((t) => t.tag.id)
    );
    if (tagIds.length > 0) {
      await tagsService.incrementPostCounts([...new Set(tagIds)]).catch(() => {});
    }

    await this._invalidatePostListCache();
    return scheduled.length;
  }

  private async _invalidatePostListCache(): Promise<void> {
    await cache.del(CACHE_KEYS.trending());
    const keys = ['latest', 'popular', 'trending', 'oldest'].flatMap(sort =>
      [1, 2, 3].flatMap(page =>
        [10, 20].map(limit => CACHE_KEYS.postList(page, limit, undefined, sort))
      )
    );
    await Promise.all(keys.map(k => cache.del(k)));
  }
}

export const postsService = new PostsService();
