'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePosts } from '@/hooks/use-posts';
import { useTags } from '@/hooks/use-data';
import { PostCard } from '@/components/post/post-card';
import { PostCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function ExploreInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get('tag') ?? undefined;

  // Fix: pass only defined params so the backend doesn't receive undefined values
  // that it may treat as filter=undefined (which some ORMs interpret as "no results")
  const queryParams: Record<string, string | number | undefined> = {
    sort: 'latest',
    limit: 12,
    status: 'PUBLISHED',
  };
  if (activeTag) queryParams.tag = activeTag;

  const { data, isLoading } = usePosts(queryParams);
  const { data: tags = [] } = useTags();

  const setTag = (slug?: string) => {
    const p = new URLSearchParams(searchParams.toString());
    slug ? p.set('tag', slug) : p.delete('tag');
    router.push(`/explore?${p.toString()}`);
  };

  const posts = data?.data ?? [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500 mb-2">Discover</p>
        <h1 className="font-serif text-[2.2rem] tracking-[-0.02em] mb-8">Explore stories</h1>
      </motion.div>

      {/* Tag filter */}
      <div className="flex flex-wrap gap-2 mb-10 pb-8 border-b border-celadon-300/15">
        <button
          onClick={() => setTag()}
          className={cn('px-4 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200',
            !activeTag ? 'bg-muted_teal-100 text-cream-900' : 'border border-celadon-300/20 text-muted_teal-300 hover:border-celadon-300/30 hover:text-muted_teal-100'
          )}
        >
          All
        </button>
        {tags.slice(0, 20).map(t => (
          <button
            key={t.id}
            onClick={() => setTag(t.slug)}
            className={cn('px-4 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200',
              activeTag === t.slug ? 'bg-muted_teal-100 text-cream-900' : 'border border-celadon-300/20 text-muted_teal-300 hover:border-celadon-300/30 hover:text-muted_teal-100'
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading
          ? Array.from({ length: 9 }).map((_, i) => <PostCardSkeleton key={i} />)
          : posts.length === 0
            ? (
              <div className="col-span-3 py-24 text-center">
                <p className="font-serif text-xl text-muted_teal-300/70 mb-2">
                  {activeTag ? 'No stories in this topic yet' : 'No published stories yet'}
                </p>
                {activeTag && (
                  <button onClick={() => setTag()} className="text-[13px] text-muted_teal-500 hover:underline mt-1">
                    Browse all stories
                  </button>
                )}
              </div>
            )
            : posts.map(p => <PostCard key={p.id} post={p} />)
        }
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto px-6 py-12">
        <Skeleton className="h-10 w-48 rounded-xl mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <PostCardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <ExploreInner />
    </Suspense>
  );
}
