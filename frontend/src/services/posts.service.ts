import { api } from '@/lib/api-client';
import type { Post, PaginationMeta } from '@/types';

export interface PostsResponse { data: Post[]; meta: PaginationMeta; }
export interface CreatePostPayload {
  title: string; content: string; contentJson?: Record<string, unknown>;
  excerpt?: string; coverImage?: string; tags?: string[];
  status?: 'DRAFT' | 'PUBLISHED'; metaTitle?: string; metaDescription?: string;
  allowComments?: boolean;
}

export const postsService = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<Post[]>('/posts', params),

  trending: () => api.get<Post[]>('/posts/trending'),

  getBySlug: (slug: string) => api.get<Post>(`/posts/${slug}`),

  getForEdit: (id: string) => api.get<Post>(`/posts/edit/${id}`),

  getUserPosts: (username: string, params?: Record<string, string | number | undefined>) =>
    api.get<Post[]>(`/posts/user/${username}`, params),

  drafts: () => api.get<Post[]>('/posts/me/drafts'),

  create: (payload: CreatePostPayload) => api.post<Post>('/posts', payload),

  update: (id: string, payload: Partial<CreatePostPayload>) =>
    api.patch<Post>(`/posts/${id}`, payload),

  delete: (id: string) => api.delete<null>(`/posts/${id}`),
};
