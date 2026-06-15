import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  // Content: 100,000 chars covers any legitimate post; prevents ~1MB payloads
  content: z.string().min(1).max(100_000),
  contentJson: z.record(z.unknown()).optional(),
  excerpt: z.string().max(500).optional(),
  coverImage: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string().min(1).max(50)).max(5).default([]),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED']).default('DRAFT'),
  scheduledAt: z.string().datetime().optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  allowComments: z.boolean().default(true),
});

export const updatePostSchema = createPostSchema.partial();

export const listPostsQuerySchema = z.object({
  // z.coerce.number() handles missing/empty/NaN cleanly unlike z.string().transform(Number)
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  tag: z.string().optional(),
  author: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).optional(),
  sort: z.enum(['latest', 'oldest', 'popular', 'trending']).default('latest'),
  search: z.string().max(200).optional(),
});

export type CreatePostDto = z.infer<typeof createPostSchema>;
export type UpdatePostDto = z.infer<typeof updatePostSchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
