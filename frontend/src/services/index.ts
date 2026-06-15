import { api } from '@/lib/api-client';
import type { Comment, User, Notification, SearchResults, DashboardStats, Post } from '@/types';

export const commentsService = {
  list: (postId: string) => api.get<Comment[]>(`/posts/${postId}/comments`),
  create: (postId: string, content: string, parentId?: string) =>
    api.post<Comment>(`/posts/${postId}/comments`, { content, parentId }),
  update: (postId: string, commentId: string, content: string) =>
    api.patch<Comment>(`/posts/${postId}/comments/${commentId}`, { content }),
  delete: (postId: string, commentId: string) =>
    api.delete<null>(`/posts/${postId}/comments/${commentId}`),
};

export const likesService = {
  like: (postId: string) => api.post<{ liked: boolean }>(`/posts/${postId}/likes`),
  unlike: (postId: string) => api.delete<{ liked: boolean }>(`/posts/${postId}/likes`),
};

export const bookmarksService = {
  list: (page?: number) => api.get<Post[]>('/bookmarks', { page }),
  add: (postId: string) => api.post<{ bookmarked: boolean }>(`/bookmarks/${postId}`),
  remove: (postId: string) => api.delete<{ bookmarked: boolean }>(`/bookmarks/${postId}`),
};

export const usersService = {
  getProfile: (username: string) => api.get<User>(`/users/${username}`),
  updateProfile: (data: Partial<User['profile']>) => api.patch<User>('/users/profile', data),
  follow: (username: string) => api.post<{ following: boolean }>(`/users/${username}/follow`),
  unfollow: (username: string) => api.delete<{ following: boolean }>(`/users/${username}/follow`),
  followers: (username: string) => api.get<User[]>(`/users/${username}/followers`),
  following: (username: string) => api.get<User[]>(`/users/${username}/following`),
};

export const notificationsService = {
  list: (page?: number) => api.get<Notification[]>('/notifications', { page }),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.patch<null>(`/notifications/${id}/read`),
  markAllRead: () => api.patch<null>('/notifications/mark-all-read'),
};

export const searchService = {
  search: (q: string, type = 'all', page = 1) =>
    api.get<SearchResults>('/search', { q, type, page }),
};

export const analyticsService = {
  dashboard: () => api.get<DashboardStats>('/analytics/dashboard'),
  topPosts: () => api.get<Post[]>('/analytics/top-posts'),
};

export const tagsService = {
  list: () => api.get<Array<{ id: string; name: string; slug: string; color: string | null; postCount: number }>>('/tags'),
};
