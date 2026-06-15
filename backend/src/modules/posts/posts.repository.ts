import { Post, PostStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const postSelectPublic = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  status: true,
  publishedAt: true,
  readingTime: true,
  viewCount: true,
  likeCount: true,
  commentCount: true,
  bookmarkCount: true,
  metaTitle: true,
  metaDescription: true,
  allowComments: true,
  isFeatured: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
          bio: true,
        },
      },
    },
  },
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          slug: true,
          color: true,
        },
      },
    },
  },
} satisfies Prisma.PostSelect;

export type PostSummary = Prisma.PostGetPayload<{ select: typeof postSelectPublic }>;

export class PostsRepository {
  async findBySlug(slug: string, includeContent = false) {
    return prisma.post.findFirst({
      where: { slug, deletedAt: null },
      select: {
        ...postSelectPublic,
        ...(includeContent && { content: true, contentJson: true }),
      },
    });
  }

  async findById(id: string) {
    return prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: { ...postSelectPublic, content: true, contentJson: true },
    });
  }

  async findMany(params: {
    page: number;
    limit: number;
    status?: PostStatus;
    authorId?: string;
    tagSlug?: string;
    sort?: string;
    search?: string;
  }) {
    const { page, limit, status, authorId, tagSlug, sort, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      deletedAt: null,
      ...(status && { status }),
      ...(authorId && { authorId }),
      ...(tagSlug && {
        tags: { some: { tag: { slug: tagSlug } } },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { excerpt: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.PostOrderByWithRelationInput =
      sort === 'oldest'
        ? { publishedAt: 'asc' }
        : sort === 'popular'
          ? { viewCount: 'desc' }
          : sort === 'trending'
            ? { likeCount: 'desc' }
            : { publishedAt: 'desc' };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        select: postSelectPublic,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return { posts, total };
  }

  async create(data: {
    authorId: string;
    title: string;
    slug: string;
    content: string;
    contentJson?: Record<string, unknown>;
    excerpt?: string;
    coverImage?: string;
    status: PostStatus;
    scheduledAt?: Date;
    publishedAt?: Date;
    readingTime: number;
    metaTitle?: string;
    metaDescription?: string;
    allowComments: boolean;
    tags: string[];
  }): Promise<Post> {
    const { tags, ...postData } = data;

    return prisma.post.create({
      data: {
        ...postData,
        contentJson: postData.contentJson as Prisma.InputJsonValue | undefined,
        tags: {
          create: tags.map((tagId) => ({
            tag: { connect: { id: tagId } },
          })),
        },
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      slug: string;
      content: string;
      contentJson: Record<string, unknown>;
      excerpt: string;
      coverImage: string;
      status: PostStatus;
      publishedAt: Date;
      scheduledAt: Date;
      readingTime: number;
      metaTitle: string;
      metaDescription: string;
      allowComments: boolean;
      tags: string[];
    }>
  ) {
    const { tags, contentJson, ...updateData } = data;

    return prisma.post.update({
      where: { id },
      data: {
        ...updateData,
        // contentJson excluded from spread — Record<string,unknown> is not
        // assignable to Prisma.InputJsonValue when spread, so handle explicitly
        ...(contentJson !== undefined && {
          contentJson: contentJson as Prisma.InputJsonValue,
        }),
        ...(tags !== undefined && {
          tags: {
            deleteMany: {},
            create: tags.map((tagId) => ({
              tag: { connect: { id: tagId } },
            })),
          },
        }),
      },
      select: { ...postSelectPublic, content: true, contentJson: true },
    });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async incrementViewCount(id: string): Promise<void> {
    await prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async getTrending(limit = 10) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        publishedAt: { gte: since },
      },
      select: postSelectPublic,
      orderBy: [{ viewCount: 'desc' }, { likeCount: 'desc' }],
      take: limit,
    });
  }

  async getUserDrafts(authorId: string) {
    return prisma.post.findMany({
      where: { authorId, status: 'DRAFT', deletedAt: null },
      select: postSelectPublic,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getScheduledPosts() {
    return prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: new Date() },
        deletedAt: null,
      },
      // Include tags so publishScheduledPosts can update tag postCounts
      select: {
        id: true,
        tags: {
          select: { tag: { select: { id: true } } },
        },
      },
    });
  }
}

export const postsRepository = new PostsRepository();