'use client';

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useTrendingPosts } from '@/hooks/use-posts';
import { PostCard } from '@/components/post/post-card';
import { PostCardSkeleton } from '@/components/ui/skeleton';

export default function TrendingPage() {
  const { data: trendingData, isLoading } = useTrendingPosts();
  const posts = trendingData?.data ?? [];
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }} className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500 mb-2">This week</p>
        <h1 className="font-serif text-[2.2rem] tracking-[-0.02em]">Trending stories</h1>
      </motion.div>
      <div className="flex flex-col gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <PostCardSkeleton key={i} />)
          : posts.length === 0
            ? <p className="text-center py-20 font-serif text-xl text-muted_teal-300/70">Nothing trending yet</p>
            : posts.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22,1,0.36,1] }} className="flex items-start gap-5">
                  <span className="font-serif text-[2.5rem] leading-none text-black/10 select-none shrink-0 pt-3 w-10 text-right">{String(i + 1).padStart(2,'0')}</span>
                  <div className="flex-1"><PostCard post={post} /></div>
                </motion.div>
              ))
        }
      </div>
    </div>
  );
}
