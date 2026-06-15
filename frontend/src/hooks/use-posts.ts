import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsService, type CreatePostPayload } from '@/services/posts.service';
import { likesService, bookmarksService } from '@/services/index';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';

export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...postKeys.lists(), params] as const,
  trending: () => [...postKeys.all, 'trending'] as const,
  detail: (slug: string) => [...postKeys.all, 'detail', slug] as const,
  edit: (id: string) => [...postKeys.all, 'edit', id] as const,
  drafts: () => [...postKeys.all, 'drafts'] as const,
  userPosts: (username: string) => [...postKeys.all, 'user', username] as const,
};

export function usePosts(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: postKeys.list(params ?? {}),
    queryFn: () => postsService.list(params),
  });
}

export function useTrendingPosts() {
  return useQuery({
    queryKey: postKeys.trending(),
    queryFn: () => postsService.trending(),
  });
}

export function usePost(slug: string) {
  return useQuery({
    queryKey: postKeys.detail(slug),
    queryFn: () => postsService.getBySlug(slug),
    select: (res) => res.data,
    enabled: !!slug,
  });
}

export function usePostForEdit(id: string) {
  return useQuery({
    queryKey: postKeys.edit(id),
    queryFn: () => postsService.getForEdit(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useDrafts() {
  return useQuery({
    queryKey: postKeys.drafts(),
    queryFn: () => postsService.drafts(),
  });
}

export function useUserPosts(username: string) {
  return useQuery({
    queryKey: postKeys.userPosts(username),
    queryFn: () => postsService.getUserPosts(username),
    enabled: !!username,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (payload: CreatePostPayload) => postsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.drafts() });
      if (user?.username) {
        queryClient.invalidateQueries({ queryKey: postKeys.userPosts(user.username) });
      }
    },
    onError: (err: Error) => addToast({ title: 'Failed to save', description: err.message, variant: 'error' }),
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreatePostPayload> }) =>
      postsService.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.edit(id) });
      queryClient.invalidateQueries({ queryKey: postKeys.drafts() });
      if (user?.username) {
        queryClient.invalidateQueries({ queryKey: postKeys.userPosts(user.username) });
      }
    },
    onError: (err: Error) => addToast({ title: 'Failed to update', description: err.message, variant: 'error' }),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (id: string) => postsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.drafts() });
      if (user?.username) {
        queryClient.invalidateQueries({ queryKey: postKeys.userPosts(user.username) });
      }
      addToast({ title: 'Post deleted', variant: 'success' });
    },
    onError: (err: Error) => addToast({ title: 'Failed to delete', description: err.message, variant: 'error' }),
  });
}

/**
 * useLikePost — accepts slug so it can invalidate the detail query.
 *
 * Previously only lists() and trending() were invalidated, meaning the
 * post detail page showed a stale like count/state until hard refresh.
 *
 * slug is optional for backward compat — callers on list pages that don't
 * have the slug can omit it; invalidation just won't include the detail key.
 */
export function useLikePost(
  postId: string,
  getCurrentLiked: () => boolean,
  onSettledCallback?: () => void,
  slug?: string,
) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: () => {
      if (!postId) return Promise.reject(new Error('No post ID'));
      return getCurrentLiked() ? likesService.unlike(postId) : likesService.like(postId);
    },
    onError: (err: Error & { status?: number }) => {
      if (!isAuthenticated) {
        addToast({ title: 'Sign in to like posts', variant: 'warning' });
      } else if (err.status === 404 || err.message?.toLowerCase().includes('not found')) {
        queryClient.invalidateQueries({ queryKey: postKeys.lists() });
        queryClient.invalidateQueries({ queryKey: postKeys.trending() });
        if (slug) queryClient.invalidateQueries({ queryKey: postKeys.detail(slug) });
      } else {
        addToast({ title: err.message, variant: 'error' });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.trending() });
      // Invalidate the detail query so like count and isLiked state are fresh
      if (slug) queryClient.invalidateQueries({ queryKey: postKeys.detail(slug) });
      onSettledCallback?.();
    },
  });
}

/**
 * useBookmarkPost — accepts slug so it can invalidate the detail query.
 * Previously detail query was not invalidated, leaving stale bookmark state.
 */
export function useBookmarkPost(
  postId: string,
  getCurrentBookmarked: () => boolean,
  slug?: string,
) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: () => getCurrentBookmarked() ? bookmarksService.remove(postId) : bookmarksService.add(postId),
    onError: (err: Error) => {
      if (!isAuthenticated) {
        addToast({ title: 'Sign in to bookmark posts', variant: 'warning' });
      } else {
        addToast({ title: err.message, variant: 'error' });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      // Invalidate detail so bookmark state is fresh on the post page
      if (slug) queryClient.invalidateQueries({ queryKey: postKeys.detail(slug) });
    },
  });
}
