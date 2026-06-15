'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/use-data';
import { useAuthStore } from '@/store/auth.store';
import { UserAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatRelativeDate } from '@/lib/utils';

export default function NotificationsPage() {
  const { isAuthenticated } = useAuthStore();
  const { data, isLoading } = useNotifications();
  const markAll = useMarkAllNotificationsRead();

  if (!isAuthenticated) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Bell className="size-12 text-muted_teal-300/70/40" strokeWidth={1} />
      <p className="font-serif text-xl text-muted_teal-300">Sign in to see notifications</p>
      <Link href="/login" className="px-6 py-2.5 rounded-full bg-muted_teal-100 text-cream-900 text-[13px] hover:bg-muted_teal-100/85 transition-all duration-200">Sign in</Link>
    </div>
  );

  const notifications = data?.notifications ?? [];
  const hasUnread = notifications.some(n => !n.isRead);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }} className="flex items-end justify-between mb-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500 mb-2">Activity</p>
          <h1 className="font-serif text-[2.2rem] tracking-[-0.02em]">Notifications</h1>
        </div>
        {hasUnread && (
          <button onClick={() => markAll.mutate()} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-celadon-300/20 text-[12px] text-muted_teal-300 hover:border-celadon-300/30 hover:text-muted_teal-100 transition-all duration-200">
            <CheckCheck className="size-3.5" strokeWidth={1.5} />
            Mark all read
          </button>
        )}
      </motion.div>

      <div className="rounded-2xl border border-celadon-300/15 overflow-hidden bg-cream-900/50 divide-y divide-black/6">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-4">
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))
          : notifications.length === 0
            ? (
              <div className="flex flex-col items-center py-20 gap-3">
                <Bell className="size-10 text-muted_teal-300/70/30" strokeWidth={1} />
                <p className="text-[14px] text-muted_teal-300/70 font-serif">All caught up</p>
              </div>
            )
            : notifications.map((n, i) => (
                <motion.div key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <Link href={n.resourceUrl ?? '#'} className={cn('relative flex items-start gap-4 p-4 hover:bg-celadon-500/5 transition-colors duration-200', !n.isRead && 'bg-celadon/6')}>
                    {!n.isRead && <span className="absolute left-4 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-muted_teal-500" />}
                    <div className={!n.isRead ? 'ml-4' : ''}>
                      <UserAvatar src={n.trigger.profile?.avatarUrl} name={n.trigger.profile?.displayName ?? n.trigger.username} username={n.trigger.username} size="sm" className="shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium leading-snug">{n.title}</p>
                      <p className="text-[12px] text-muted_teal-300 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[11px] text-muted_teal-300/70 mt-1.5">{formatRelativeDate(n.createdAt)}</p>
                    </div>
                  </Link>
                </motion.div>
              ))
        }
      </div>
    </div>
  );
}
