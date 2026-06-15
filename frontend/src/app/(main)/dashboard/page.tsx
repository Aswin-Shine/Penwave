'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { PenLine, Eye, Heart, MessageCircle, Users, TrendingUp, FileText, ArrowRight, Trash2, ExternalLink, Edit2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { analyticsService } from '@/services/index';
import { useDrafts, useDeletePost, useUserPosts } from '@/hooks/use-posts';
import type { Post } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatRelativeDate } from '@/lib/utils';

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } },
};

function DeleteConfirm({ postId, onCancel }: { postId: string; onCancel: () => void }) {
  const deleteMutation = useDeletePost();
  return (
    <div className="flex items-center gap-2 ml-auto">
      <span className="text-[11px] text-red-500">Delete this post?</span>
      <button
        onClick={() => deleteMutation.mutate(postId, { onSuccess: onCancel })}
        disabled={deleteMutation.isPending}
        className="text-[11px] font-medium text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
      >
        {deleteMutation.isPending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button onClick={onCancel} className="text-[11px] text-muted_teal-300 hover:text-muted_teal-100 px-2 py-1 rounded-lg hover:bg-celadon-500/10 transition-colors">
        Cancel
      </button>
    </div>
  );
}

function PostRow({ post, isDraft }: { post: { id: string; title: string; slug?: string; updatedAt: string; viewCount?: number; likeCount?: number }; isDraft: boolean }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="group flex items-center gap-3 p-4 rounded-2xl border border-celadon-300/15 bg-cream-900/50 hover:border-celadon-300/30 hover:bg-cream-900/80 transition-all duration-200">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium line-clamp-1 group-hover:text-muted_teal-500 transition-colors duration-200">
          {post.title || 'Untitled'}
        </p>
        <p className="text-[11px] text-muted_teal-300/70 mt-0.5">
          {formatRelativeDate(post.updatedAt)}
          {!isDraft && post.viewCount !== undefined && (
            <span className="ml-2">· {formatNumber(post.viewCount)} views · {formatNumber(post.likeCount ?? 0)} likes</span>
          )}
        </p>
      </div>

      {confirming ? (
        <DeleteConfirm postId={post.id} onCancel={() => setConfirming(false)} />
      ) : (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Link
            href={`/editor/${post.id}`}
            className="p-1.5 rounded-lg text-muted_teal-300 hover:text-muted_teal-100 hover:bg-celadon-500/10 transition-colors"
            title="Edit"
          >
            <Edit2 className="size-3.5" strokeWidth={1.5} />
          </Link>
          {!isDraft && post.slug && (
            <Link
              href={`/post/${post.slug}`}
              className="p-1.5 rounded-lg text-muted_teal-300 hover:text-muted_teal-100 hover:bg-celadon-500/10 transition-colors"
              title="View post"
            >
              <ExternalLink className="size-3.5" strokeWidth={1.5} />
            </Link>
          )}
          <button
            onClick={() => setConfirming(true)}
            className="p-1.5 rounded-lg text-muted_teal-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: stats, isLoading: sl } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsService.dashboard(),
    select: r => r.data,
  });
  const { data: draftsData, isLoading: dl } = useDrafts();
  const drafts = draftsData?.data ?? [];
  const { data: publishedPostsData, isLoading: pl } = useUserPosts(user?.username ?? '');
  const publishedPosts = publishedPostsData?.data ?? [];

  const statCards = [
    { label: 'Stories', value: stats?.totalPosts ?? 0, icon: FileText, color: 'text-violet-500 bg-violet-50' },
    { label: 'Views', value: stats?.totalViews ?? 0, icon: Eye, color: 'text-sky-500 bg-sky-50' },
    { label: 'Likes', value: stats?.totalLikes ?? 0, icon: Heart, color: 'text-rose-500 bg-rose-50' },
    { label: 'Comments', value: stats?.totalComments ?? 0, icon: MessageCircle, color: 'text-amber-500 bg-amber-50' },
    { label: 'Followers', value: stats?.totalFollowers ?? 0, icon: Users, color: 'text-emerald-500 bg-emerald-50' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500 mb-2">Dashboard</p>
          <h1 className="font-serif text-[2.2rem] tracking-[-0.02em]">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            <span className="italic">{user?.profile?.displayName?.split(' ')[0] ?? user?.username}</span>
          </h1>
        </div>
        <Link
          href="/editor"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-muted_teal-100 text-cream-900 text-[13px] font-medium hover:bg-muted_teal-100/85 transition-all duration-200"
        >
          <PenLine className="size-3.5" strokeWidth={1.5} />
          New story
        </Link>
      </div>

      {/* Stats */}
      <motion.div
        variants={stagger.container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-12"
      >
        {sl
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          : statCards.map(s => (
              <motion.div
                key={s.label}
                variants={stagger.item}
                className="flex flex-col gap-3 p-4 rounded-2xl border border-celadon-300/15 bg-cream-900/60"
              >
                <div className={`p-2 rounded-xl w-fit ${s.color}`}>
                  <s.icon className="size-4" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-serif text-2xl tracking-[-0.02em]">{formatNumber(s.value)}</p>
                  <p className="text-[11px] text-muted_teal-300/70 uppercase tracking-[0.08em] mt-0.5">{s.label}</p>
                </div>
              </motion.div>
            ))
        }
      </motion.div>

      <div className="space-y-10">
        {/* Published posts with delete */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500">
              Published stories
            </p>
            <span className="text-[12px] text-muted_teal-300/70">{publishedPosts.length}</span>
          </div>
          <div className="space-y-2">
            {pl
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)
              : publishedPosts.length === 0
                ? (
                  <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-celadon-300/25 text-center">
                    <TrendingUp className="size-8 text-muted_teal-300/40 mb-2" strokeWidth={1} />
                    <p className="text-[13px] text-muted_teal-300/70">No published stories yet</p>
                    <Link href="/editor" className="text-[12px] text-muted_teal-500 hover:underline mt-1">
                      Start writing
                    </Link>
                  </div>
                )
                : publishedPosts.map(post => (
                    <PostRow
                      key={post.id}
                      post={{ id: post.id, title: post.title, slug: post.slug, updatedAt: post.updatedAt, viewCount: post.viewCount, likeCount: post.likeCount }}
                      isDraft={false}
                    />
                  ))
            }
          </div>
        </section>

        {/* Drafts with delete */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500">Drafts</p>
            <span className="text-[12px] text-muted_teal-300/70">{drafts.length}</span>
          </div>
          <div className="space-y-2">
            {dl
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)
              : drafts.length === 0
                ? (
                  <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-celadon-300/25 text-center">
                    <FileText className="size-8 text-muted_teal-300/40 mb-2" strokeWidth={1} />
                    <p className="text-[13px] text-muted_teal-300/70">No drafts yet</p>
                    <Link href="/editor" className="text-[12px] text-muted_teal-500 hover:underline mt-1">
                      Start writing
                    </Link>
                  </div>
                )
                : drafts.map(post => (
                    <PostRow
                      key={post.id}
                      post={{ id: post.id, title: post.title, updatedAt: post.updatedAt }}
                      isDraft={true}
                    />
                  ))
            }
          </div>
        </section>
      </div>
    </div>
  );
}