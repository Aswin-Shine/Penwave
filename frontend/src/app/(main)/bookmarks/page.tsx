'use client';

import { BookmarkIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { bookmarksService } from '@/services/index';
import type { Post } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { PostCard } from '@/components/post/post-card';
import { PostCardSkeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function BookmarksPage() {
  const { isAuthenticated } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => bookmarksService.list(),
    select: r => {
      // Backend returns Bookmark[] where each has a .post field
      // Handle both shapes safely
      const items = r.data ?? [];
      return items.map((item: Post | { post: Post }) =>
        'post' in item ? item.post : item
      );
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <BookmarkIcon className="size-12 text-muted_teal-300/70/40" strokeWidth={1} />
      <p className="font-serif text-xl text-muted_teal-300">Sign in to see your bookmarks</p>
      <Link href="/login" className="px-6 py-2.5 rounded-full bg-muted_teal-100 text-cream-900 text-[13px] hover:bg-muted_teal-100/85 transition-all duration-200">Sign in</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }} className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500 mb-2">Your library</p>
        <h1 className="font-serif text-[2.2rem] tracking-[-0.02em]">Bookmarks</h1>
      </motion.div>
      <div className="flex flex-col gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <PostCardSkeleton key={i} />)
          : !data || data.length === 0
            ? (
              <div className="flex flex-col items-center py-24 gap-3">
                <BookmarkIcon className="size-12 text-muted_teal-300/70/30" strokeWidth={1} />
                <p className="text-muted_teal-300/70 font-serif text-lg">No bookmarks yet</p>
                <Link href="/explore" className="text-[13px] text-muted_teal-500 hover:underline">Explore stories</Link>
              </div>
            )
            : data.map(post => <PostCard key={post.id} post={post} />)
        }
      </div>
    </div>
  );
}