'use client';

import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { useTrendingPosts } from '@/hooks/use-posts';
import { useTags } from '@/hooks/use-data';
import { PostCard } from '@/components/post/post-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function Sidebar() {
  const { data: trendingData, isLoading: trendingLoading } = useTrendingPosts();
  const trending = trendingData?.data;
  const { data: tags, isLoading: tagsLoading } = useTags();

  return (
    <div className="flex flex-col gap-6 sticky top-20">
      {/* Trending */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="size-4 text-primary" />
          <h2 className="font-semibold text-sm">Trending this week</h2>
        </div>
        <div className="flex flex-col gap-2">
          {trendingLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-2 p-2">
                  <Skeleton className="size-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))
            : trending?.slice(0, 5).map((post) => (
                <PostCard key={post.id} post={post} variant="compact" />
              ))
          }
        </div>
      </section>

      {/* Tags */}
      <section>
        <h2 className="font-semibold text-sm mb-4">Popular topics</h2>
        <div className="flex flex-wrap gap-2">
          {tagsLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))
            : tags?.slice(0, 16).map((tag) => (
                <Link key={tag.id} href={`/explore?tag=${tag.slug}`}>
                  <Badge variant="tag">{tag.name}</Badge>
                </Link>
              ))
          }
        </div>
      </section>

      {/* Footer links */}
      <footer className="text-xs text-muted_teal-300/70 flex flex-wrap gap-2 pt-2">
        {[
          { label: 'About', href: '/about' },
          { label: 'Privacy', href: '/privacy' },
          { label: 'Terms', href: '/terms' },
          { label: 'Help', href: '/help' },
        ].map(({ label, href }) => (
          <Link key={label} href={href} className="hover:text-muted_teal-100 transition-colors">{label}</Link>
        ))}
        <span>© 2024 Penwave</span>
      </footer>
    </div>
  );
}
