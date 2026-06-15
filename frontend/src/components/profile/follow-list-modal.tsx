'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFollowers, useFollowing } from '@/hooks/use-data';
import { UserAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  username: string;
  tab: 'followers' | 'following' | null;
  onClose: () => void;
}

function UserRow({ user }: {
  user: {
    id: string;
    username: string;
    profile: { displayName: string | null; avatarUrl: string | null; bio: string | null } | null;
  };
}) {
  const name = user.profile?.displayName ?? user.username;
  return (
    <Link
      href={`/${user.username}`}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-celadon-500/8 transition-colors duration-150 group"
    >
      <UserAvatar
        src={user.profile?.avatarUrl}
        name={name}
        username={user.username}
        size="md"
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-muted_teal-100 group-hover:text-muted_teal-500 transition-colors duration-150 truncate">
          {name}
        </p>
        <p className="text-[12px] text-muted_teal-300/70 truncate">@{user.username}</p>
        {user.profile?.bio && (
          <p className="text-[12px] text-muted_teal-300/60 truncate mt-0.5">{user.profile.bio}</p>
        )}
      </div>
    </Link>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
          <Skeleton className="size-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}

export function FollowListModal({ username, tab, onClose }: Props) {
  const isOpen = tab !== null;
  const overlayRef = useRef<HTMLDivElement>(null);

  const followersQuery = useFollowers(username, tab === 'followers');
  const followingQuery = useFollowing(username, tab === 'following');

  const list = tab === 'followers' ? followersQuery.data : followingQuery.data;
  const isLoading = tab === 'followers' ? followersQuery.isLoading : followingQuery.isLoading;

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md"
          >
            <div className="bg-[#fbfcf4] rounded-3xl shadow-2xl border border-celadon-300/20 overflow-hidden flex flex-col max-h-[70vh]">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-celadon-300/15 shrink-0">
                <h2 className="font-serif text-lg tracking-[-0.01em] capitalize">{tab}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full text-muted_teal-300 hover:text-muted_teal-100 hover:bg-celadon-500/10 transition-all duration-150"
                >
                  <X className="size-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1 py-1">
                {isLoading ? (
                  <SkeletonRows />
                ) : !list || list.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-[14px] text-muted_teal-300/70">
                      {tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                    </p>
                  </div>
                ) : (
                  list.map((user) => <UserRow key={user.id} user={user} />)
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
