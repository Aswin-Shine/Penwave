'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { usePosts } from '@/hooks/use-posts';
import { useTrendingPosts } from '@/hooks/use-posts';
import { useTags } from '@/hooks/use-data';
import { PostCard } from '@/components/post/post-card';
import { PostCardSkeleton } from '@/components/ui/skeleton';
import { cn, formatReadingTime, formatDate, truncate } from '@/lib/utils';
import type { Post } from '@/types';

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.08 } } },
  item: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  },
};

function FeaturedCard({ post }: { post: Post }) {
  return (
    <Link href={`/post/${post.slug}`} className="group relative block overflow-hidden rounded-3xl border border-celadon-300/15 bg-cream-800/30 hover:border-celadon-300/25 transition-all duration-500 editorial-shadow-hover">
      <div className="aspect-[16/9] overflow-hidden">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#dde7c7] to-[#98c9a3] flex items-center justify-center">
            <span className="font-serif text-4xl text-muted_teal-300 opacity-30">P</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-7">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {post.tags.slice(0, 2).map(({ tag }) => (
            <span key={tag.id} className="text-[10px] uppercase tracking-[0.15em] text-cream-900/70 bg-cream-900/10 backdrop-blur-sm rounded-full px-2.5 py-0.5">
              {tag.name}
            </span>
          ))}
          <span className="text-[11px] text-white/50">{formatReadingTime(post.readingTime)}</span>
        </div>
        <h2 className="font-serif text-2xl md:text-3xl text-white leading-tight tracking-[-0.02em] mb-2 line-clamp-2">
          {post.title}
        </h2>
        <div className="flex items-center gap-2 text-[12px] text-white/60">
          <span>{post.author.profile?.displayName ?? post.author.username}</span>
          <span>·</span>
          <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Popular' },
  { value: 'trending', label: 'Trending' },
] as const;
type SortOption = (typeof SORT_OPTIONS)[number]['value'];

export function HomeFeed() {
  const [sort, setSort] = useState<SortOption>('latest');
  const [page, setPage] = useState(1);

  // Pass status=PUBLISHED explicitly — some backends require this to filter
  // and ignore posts in DRAFT status on public feeds
  const { data, isLoading } = usePosts({ sort, page, limit: 9, status: 'PUBLISHED' });
  const { data: trendingData } = useTrendingPosts();
  const trending = trendingData?.data ?? [];
  const { data: tags = [] } = useTags();

  const featured = data?.data[0];
  const rest = data?.data.slice(1) ?? [];

  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-end justify-between pt-20 pb-10 border-b border-celadon-300/15 mb-10"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500 mb-2">Discover</p>
          <h2 className="font-serif text-3xl tracking-[-0.02em]">Latest stories</h2>
        </div>
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSort(opt.value); setPage(1); }}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200',
                sort === opt.value
                  ? 'bg-muted_teal-100 text-cream-900'
                  : 'text-muted_teal-300 hover:text-muted_teal-100 hover:bg-celadon-500/10'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Featured */}
      {isLoading ? (
        <div className="skeleton w-full aspect-[16/9] rounded-3xl mb-10" />
      ) : featured ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10"
        >
          <FeaturedCard post={featured} />
        </motion.div>
      ) : null}

      {/* Grid */}
      <motion.div
        variants={stagger.container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12"
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <motion.div key={i} variants={stagger.item}>
                <PostCardSkeleton />
              </motion.div>
            ))
          : rest.map((post) => (
              <motion.div key={post.id} variants={stagger.item}>
                <PostCard post={post} />
              </motion.div>
            ))
        }
      </motion.div>

      {/* Empty state — only shown when not loading and no posts returned */}
      {!isLoading && (data?.data.length ?? 0) === 0 && (
        <div className="py-20 text-center border border-celadon-300/10 rounded-3xl mb-12">
          <p className="font-serif text-xl text-muted_teal-300/70 mb-2">No published stories yet</p>
          <p className="text-[13px] text-muted_teal-300/50 mb-6">
            Be the first to share something with the community
          </p>
          <Link href="/editor" className="inline-flex px-5 py-2 rounded-full bg-muted_teal-100 text-cream-900 text-[13px] hover:bg-muted_teal-200 transition-all duration-200">
            Write the first story
          </Link>
        </div>
      )}

      {/* Tags strip */}
      {tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="py-10 border-t border-b border-celadon-300/15 mb-12"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500 mb-5">Browse topics</p>
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 18).map((tag) => (
              <Link
                key={tag.id}
                href={`/explore?tag=${tag.slug}`}
                className="px-4 py-2 rounded-full text-[13px] text-muted_teal-300 border border-celadon-300/15 hover:border-muted_teal-500/50 hover:text-muted_teal-100 hover:bg-celadon-500/10 transition-all duration-200"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Trending sidebar strip */}
      {trending.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500 mb-6">Trending this week</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trending.slice(0, 4).map((post, i) => (
              <Link
                key={post.id}
                href={`/post/${post.slug}`}
                className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-cream-500/20 transition-all duration-200"
              >
                <span className="font-serif text-3xl text-black/12 leading-none select-none w-8 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-medium leading-snug group-hover:text-muted_teal-500 transition-colors duration-200 line-clamp-2 mb-1">
                    {post.title}
                  </h3>
                  <span className="text-[11px] text-muted_teal-300">{formatReadingTime(post.readingTime)}</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={!data.meta.hasPrev}
            onClick={() => setPage((p) => p - 1)}
            className="px-5 py-2 rounded-full text-[13px] border border-celadon-300/20 text-muted_teal-300 hover:text-muted_teal-100 hover:border-celadon-300/30 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
          >
            Previous
          </button>
          <span className="text-[12px] text-muted_teal-300">{data.meta.page} / {data.meta.totalPages}</span>
          <button
            disabled={!data.meta.hasNext}
            onClick={() => setPage((p) => p + 1)}
            className="px-5 py-2 rounded-full text-[13px] border border-celadon-300/20 text-muted_teal-300 hover:text-muted_teal-100 hover:border-celadon-300/30 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
