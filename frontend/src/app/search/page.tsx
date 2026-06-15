'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchService } from '@/services/index';
import { PostCard } from '@/components/post/post-card';
import { UserAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { Post, User, Tag } from '@/types';

const TABS = ['all', 'posts', 'users', 'tags'] as const;
type Tab = (typeof TABS)[number];

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(value), delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, delay]);
  return debounced;
}

function SearchInner() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [tab, setTab] = useState<Tab>('all');
  const debounced = useDebounce(query, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['search', debounced, tab],
    queryFn: () => searchService.search(debounced, tab),
    select: r => r.data,
    enabled: debounced.length >= 2,
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }} className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500 mb-2">Find</p>
        <h1 className="font-serif text-[2.2rem] tracking-[-0.02em] mb-6">Search</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted_teal-300/70" strokeWidth={1.5} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Stories, writers, topics…"
            autoFocus
            className="w-full h-12 pl-11 pr-4 rounded-2xl border border-celadon-300/20 bg-cream-900/60 text-[15px] placeholder:text-muted_teal-300/70 focus:outline-none focus:ring-2 focus:ring-muted_teal-500/40 transition-all duration-200"
          />
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 pb-4 border-b border-celadon-300/15">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-1.5 rounded-full text-[12px] font-medium capitalize transition-all duration-200', tab === t ? 'bg-muted_teal-100 text-cream-900' : 'text-muted_teal-300 hover:text-muted_teal-100 hover:bg-celadon-500/10')}>
            {t}
          </button>
        ))}
      </div>

      {debounced.length < 2 && (
        <p className="text-center py-20 font-serif text-xl text-muted_teal-300/70">Start typing to search…</p>
      )}

      {isLoading && debounced.length >= 2 && (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      )}

      {data && (
        <div className="space-y-10">
          {(tab === 'all' || tab === 'posts') && (data.posts?.length ?? 0) > 0 && (
            <section>
              {tab === 'all' && <p className="text-[11px] uppercase tracking-[0.15em] text-muted_teal-500 mb-4">Stories</p>}
              <div className="flex flex-col gap-4">{(data.posts as Post[]).map(p => <PostCard key={p.id} post={p} />)}</div>
            </section>
          )}
          {(tab === 'all' || tab === 'users') && (data.users?.length ?? 0) > 0 && (
            <section>
              {tab === 'all' && <p className="text-[11px] uppercase tracking-[0.15em] text-muted_teal-500 mb-4">Writers</p>}
              <div className="flex flex-col gap-2">
                {(data.users as User[]).map(u => (
                  <Link key={u.id} href={`/${u.username}`} className="flex items-center gap-4 p-4 rounded-2xl border border-celadon-300/15 bg-cream-900/50 hover:border-celadon-300/30 hover:bg-cream-900/80 transition-all duration-200">
                    <UserAvatar src={u.profile?.avatarUrl} name={u.profile?.displayName ?? u.username} username={u.username} size="md" />
                    <div>
                      <p className="text-[14px] font-medium">{u.profile?.displayName ?? u.username}</p>
                      <p className="text-[12px] text-muted_teal-300/70">@{u.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {(tab === 'all' || tab === 'tags') && (data.tags?.length ?? 0) > 0 && (
            <section>
              {tab === 'all' && <p className="text-[11px] uppercase tracking-[0.15em] text-muted_teal-500 mb-4">Topics</p>}
              <div className="flex flex-wrap gap-2">
                {(data.tags as Tag[]).map(t => (
                  <Link key={t.id} href={`/explore?tag=${t.slug}`} className="px-4 py-2 rounded-full border border-celadon-300/20 text-[13px] text-muted_teal-300 hover:border-muted_teal-500/50 hover:text-muted_teal-100 hover:bg-celadon-500/10 transition-all duration-200">
                    {t.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
          {data && !data.posts?.length && !data.users?.length && !data.tags?.length && (
            <p className="text-center py-20 font-serif text-xl text-muted_teal-300/70">No results for &quot;{debounced}&quot;</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-6 py-12"><Skeleton className="h-12 w-full rounded-2xl" /></div>}>
      <SearchInner />
    </Suspense>
  );
}
