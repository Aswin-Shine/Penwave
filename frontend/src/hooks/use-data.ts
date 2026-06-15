import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsService, notificationsService, usersService, tagsService } from '@/services/index';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';

// ─── Comments ───────────────────────────────────────────────────────────────

export function useComments(postId: string) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: () => commentsService.list(postId),
    select: (res) => res.data ?? [],
    enabled: !!postId,
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      commentsService.create(postId, content, parentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', postId] }),
    onError: (err: Error) => addToast({ title: err.message, variant: 'error' }),
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => commentsService.delete(postId, commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', postId] }),
  });
}

// ─── Notifications ───────────────────────────────────────────────────────────

export function useNotifications(page = 1) {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationsService.list(page),
    select: (res) => ({ notifications: res.data ?? [], meta: res.meta }),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });
}

export function useUnreadNotificationCount() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.unreadCount(),
    select: (res) => res.data?.count ?? 0,
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────

export function useUserProfile(username: string) {
  return useQuery({
    queryKey: ['users', username],
    queryFn: () => usersService.getProfile(username),
    select: (res) => res.data,
    enabled: !!username,
  });
}

// Fix: useFollow — use getter function so isFollowing is never stale at call time
export function useFollow(username: string, isFollowing: boolean) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  return useMutation({
    // Read the prop value captured at mutation call time via the closure
    // The parent passes the live value from useUserProfile so this stays fresh
    mutationFn: () =>
      isFollowing ? usersService.unfollow(username) : usersService.follow(username),
    onError: () => {
      if (!isAuthenticated) addToast({ title: 'Sign in to follow users', variant: 'warning' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['users', username] }),
  });
}

export function useFollowers(username: string, enabled = false) {
  return useQuery({
    queryKey: ['users', username, 'followers'],
    queryFn: () => usersService.followers(username),
    select: (res) =>
      ((res.data ?? []) as unknown as { follower: { id: string; username: string; profile: { displayName: string | null; avatarUrl: string | null; bio: string | null } | null } }[])
        .map((f) => f.follower),
    enabled: !!username && enabled,
    staleTime: 0,
  });
}

export function useFollowing(username: string, enabled = false) {
  return useQuery({
    queryKey: ['users', username, 'following'],
    queryFn: () => usersService.following(username),
    select: (res) =>
      ((res.data ?? []) as unknown as { following: { id: string; username: string; profile: { displayName: string | null; avatarUrl: string | null; bio: string | null } | null } }[])
        .map((f) => f.following),
    enabled: !!username && enabled,
    staleTime: 0,
  });
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsService.list(),
    select: (res) => res.data ?? [],
    staleTime: 10 * 60 * 1000,
  });
}
