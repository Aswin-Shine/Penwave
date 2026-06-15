'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, MessageCircle, ArrowUpRight, Clock } from 'lucide-react';
import { useState } from 'react';
import type { Post } from '@/types';
import { UserAvatar } from '@/components/ui/avatar';
import { cn, formatDate, formatReadingTime, formatNumber, truncate } from '@/lib/utils';
import { useLikePost } from '@/hooks/use-posts';
import { useAuthStore } from '@/store/auth.store';

interface PostCardProps {
  post: Post;
  variant?: 'default' | 'compact' | 'featured';
}

export function PostCard({ post, variant = 'default' }: PostCardProps) {
  const { isAuthenticated } = useAuthStore();
  const [liked, setLiked] = useState<boolean | null>(null);
  const [displayLikeCount, setDisplayLikeCount] = useState<number | null>(null);

  const resolvedLiked = liked ?? post.isLiked ?? false;
  const likeMutation = useLikePost(post.id, () => liked ?? post.isLiked ?? false, undefined, post.slug);
  const likeCount = displayLikeCount ?? post.likeCount;

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    const nowLiked = !resolvedLiked;
    setLiked(nowLiked);
    setDisplayLikeCount((displayLikeCount ?? post.likeCount) + (nowLiked ? 1 : -1));
    likeMutation.mutate();
  };

  const authorName = post.author.profile?.displayName ?? post.author.username;

  // Fix: use the safe formatDate util (handles null/undefined/invalid strings)
  // Prefer publishedAt for published posts, fall back to createdAt
  const displayDate = formatDate(post.publishedAt ?? post.createdAt);

  const primaryTag = post.tags && post.tags.length > 0 ? post.tags[0] : undefined;

  if (variant === 'compact') {
    return (
      <Link href={`/post/${post.slug}`} className="group flex gap-4 p-4 rounded-2xl hover:bg-cream-500/20 transition-all duration-300">
        <span className="text-3xl font-serif italic text-celadon-300/60 font-semibold leading-none shrink-0 w-6">01</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted_teal-100 group-hover:text-muted_teal-500 transition-colors duration-200 line-clamp-2">{post.title}</p>
          <div className="flex items-center gap-2 text-[11px] text-muted_teal-300/70 font-light mt-1">
            <span>{authorName}</span>
            <span className="w-1 h-1 rounded-full bg-celadon-300/40" />
            <span>{formatReadingTime(post.readingTime)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <article className="group grid grid-cols-1 md:grid-cols-12 gap-8 items-start pb-12 relative font-sans">
      <div className="md:col-span-8 space-y-4 order-2 md:order-1">
        <div className="flex items-center gap-3">
          <UserAvatar src={post.author.profile?.avatarUrl} name={authorName} username={post.author.username} size="sm" />
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-muted_teal-100">{authorName}</span>
            {displayDate && (
              <>
                <span className="text-muted_teal-300/50">•</span>
                <span className="text-muted_teal-300/70 font-light">{displayDate}</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Link href={`/post/${post.slug}`} className="block group/title focus:outline-none">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-normal text-muted_teal-100 tracking-tight leading-tight group-hover/title:text-muted_teal-500 transition-colors duration-300 flex items-start gap-1">
              <span>{post.title}</span>
              <ArrowUpRight className="h-4 w-4 opacity-0 group-hover/title:opacity-100 group-hover/title:translate-x-0.5 group-hover/title:-translate-y-0.5 transition-all duration-300 shrink-0 mt-2 text-muted_teal-500" />
            </h3>
          </Link>
          {post.excerpt && (
            <p className="text-sm sm:text-base text-muted_teal-300 font-light leading-relaxed line-clamp-2 pr-4">{truncate(post.excerpt, 150)}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 max-w-lg">
          <div className="flex items-center gap-4 text-xs text-muted_teal-300/80 font-light">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-celadon-300" />
              <span>{formatReadingTime(post.readingTime)}</span>
            </div>
            {primaryTag && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted_teal-300/30 font-sans">/</span>
                <span className="text-xs font-medium text-muted_teal-500 uppercase tracking-widest">{primaryTag.tag.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted_teal-300/60 font-light">
            <button onClick={handleLike} className={cn('flex items-center gap-1 hover:text-muted_teal-500 transition-colors duration-200', resolvedLiked && 'text-rose-500 hover:text-rose-600')}>
              <Heart className={cn('h-3.5 w-3.5', resolvedLiked && 'fill-current')} />
              <span>{formatNumber(likeCount)}</span>
            </button>
            <Link href={`/post/${post.slug}#comments`} className="flex items-center gap-1 hover:text-muted_teal-500 transition-colors duration-200">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{formatNumber(post.commentCount)}</span>
            </Link>
          </div>
        </div>
      </div>

      {post.coverImage && (
        <div className="md:col-span-4 order-1 md:order-2 w-full aspect-[16/10] md:aspect-square overflow-hidden rounded-2xl bg-cream-500/20 border border-celadon-300/10 shadow-sm relative">
          <Link href={`/post/${post.slug}`} className="block w-full h-full">
            <Image src={post.coverImage} alt={post.title} fill className="object-cover transition-transform duration-700 ease-out scale-100 group-hover:scale-[1.03]" loading="lazy" />
            <div className="absolute inset-0 bg-muted_teal-100/5 mix-blend-multiply opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </Link>
        </div>
      )}
    </article>
  );
}
