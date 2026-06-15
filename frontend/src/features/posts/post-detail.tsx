'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Heart, Bookmark, Share2, Clock, Eye, MessageCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDeletePost } from '@/hooks/use-posts';
import { useState, useRef, useEffect } from 'react';
import { usePost, useLikePost, useBookmarkPost } from '@/hooks/use-posts';
import { useComments, useCreateComment } from '@/hooks/use-data';
import { useAuthStore } from '@/store/auth.store';
import { UserAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate, formatRelativeDate, formatReadingTime, formatNumber } from '@/lib/utils';
import type { Comment } from '@/types';

// FIX C-3 / M-7: client-side sanitization as defense-in-depth.
// The server sanitizes before storage (see backend sanitize.ts).
// This layer protects against any content that pre-dates the server fix
// or arrives via a path that bypasses the API.
function sanitizeForDisplay(html: string): string {
  if (typeof window === 'undefined') return html; // SSR guard
  const div = document.createElement('div');
  div.innerHTML = html;
  // Remove any script tags that made it through
  div.querySelectorAll('script, style, iframe, object, embed').forEach(el => el.remove());
  // Strip event handlers
  div.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
    });
    const href = el.getAttribute('href');
    if (href && /^javascript:/i.test(href.trim())) el.setAttribute('href', 'about:blank');
  });
  return div.innerHTML;
}

const PAGE_BG = '#fbfcf4';

function ReadingProgress({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-muted_teal-500 z-50 origin-left"
      style={{ scaleX: scrollYProgress, opacity: scrollYProgress }}
    />
  );
}

function CommentItem({ comment, postId, depth = 0 }: { comment: Comment; postId: string; depth?: number }) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const createComment = useCreateComment(postId);
  const { isAuthenticated } = useAuthStore();

  const submit = () => {
    if (!text.trim()) return;
    createComment.mutate({ content: text, parentId: comment.id }, { onSuccess: () => { setText(''); setReplying(false); } });
  };

  return (
    <div className={cn('flex gap-4', depth > 0 && 'ml-10 pl-4 border-l border-celadon-300/15')}>
      <UserAvatar src={comment.author.profile?.avatarUrl} name={comment.author.profile?.displayName ?? comment.author.username} username={comment.author.username} size="sm" className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap mb-2">
          <Link href={`/${comment.author.username}`} className="text-[13px] font-semibold hover:text-muted_teal-500 transition-colors duration-200">
            {comment.author.profile?.displayName ?? comment.author.username}
          </Link>
          <span className="text-[11px] text-muted_teal-300">{formatRelativeDate(comment.createdAt)}</span>
          {comment.isEdited && <span className="text-[11px] text-muted_teal-300">(edited)</span>}
        </div>
        <p className="text-[14px] leading-relaxed text-muted_teal-100 mb-2">{comment.content}</p>
        {isAuthenticated && depth < 2 && (
          <button onClick={() => setReplying(!replying)} className="text-[11px] text-muted_teal-300 hover:text-muted_teal-500 transition-colors duration-200 uppercase tracking-[0.08em]">
            Reply
          </button>
        )}
        {replying && (
          <div className="mt-3 flex flex-col gap-2">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Write a reply…"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-celadon-300/20 bg-cream-900/80 text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-muted_teal-500/40 transition-all duration-200"
            />
            <div className="flex gap-2">
              <button onClick={submit} disabled={createComment.isPending} className="px-4 py-1.5 rounded-full bg-muted_teal-100 text-cream-900 text-[13px] hover:bg-muted_teal-100/85 disabled:opacity-60 transition-all duration-200">
                {createComment.isPending ? '…' : 'Reply'}
              </button>
              <button onClick={() => setReplying(false)} className="px-4 py-1.5 rounded-full text-[13px] text-muted_teal-300 hover:bg-celadon-500/10 transition-colors duration-200">Cancel</button>
            </div>
          </div>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-5 flex flex-col gap-5">
            {comment.replies.map(r => <CommentItem key={r.id} comment={r} postId={postId} depth={depth + 1} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentsSection({ postId }: { postId: string }) {
  const { data: comments = [], isLoading } = useComments(postId);
  const createComment = useCreateComment(postId);
  const { isAuthenticated } = useAuthStore();
  const [text, setText] = useState('');

  return (
    <section id="comments" className="mt-16 pt-12 border-t border-celadon-300/15">
      <h2 className="font-serif text-2xl tracking-[-0.02em] mb-8">
        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
      </h2>
      {isAuthenticated ? (
        <div className="mb-10 p-5 rounded-2xl border border-celadon-300/15 bg-cream-900/60">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Share your thoughts…"
            rows={4}
            className="w-full bg-transparent text-[14px] leading-relaxed resize-none focus:outline-none placeholder:text-muted_teal-300"
          />
          <div className="flex justify-end mt-3 pt-3 border-t border-celadon-300/10">
            <button
              onClick={() => { if (text.trim()) createComment.mutate({ content: text }, { onSuccess: () => setText('') }); }}
              disabled={!text.trim() || createComment.isPending}
              className="px-5 py-2 rounded-full bg-muted_teal-100 text-cream-900 text-[13px] hover:bg-muted_teal-100/85 disabled:opacity-40 transition-all duration-200"
            >
              Post comment
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-10 p-5 rounded-2xl border border-celadon-300/15 bg-cream-900/40 text-center text-[14px] text-muted_teal-300">
          <Link href="/login" className="text-muted_teal-500 hover:underline">Sign in</Link> to join the conversation
        </div>
      )}
      <div className="flex flex-col gap-8">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-28 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                </div>
              </div>
            ))
          : comments.map(c => <CommentItem key={c.id} comment={c} postId={postId} />)
        }
      </div>
    </section>
  );
}

export function PostDetail({ slug }: { slug: string }) {
  const { data: post, isLoading } = usePost(slug);
  const { isAuthenticated, user } = useAuthStore();
  const articleRef = useRef<HTMLElement>(null);

  const [liked, setLiked] = useState<boolean | null>(null);
  const [bookmarked, setBookmarked] = useState<boolean | null>(null);
  const [displayLikeCount, setDisplayLikeCount] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // FIX C-3 / M-7: sanitized content state — only computed client-side after mount
  const [safeContent, setSafeContent] = useState<string>('');
  const router = useRouter();
  const deleteMutation = useDeletePost();

  const resolvedLiked = liked ?? post?.isLiked ?? false;
  const resolvedBookmarked = bookmarked ?? post?.isBookmarked ?? false;
  const likeCount = displayLikeCount ?? post?.likeCount ?? 0;

  // Pass slug so onSettled also invalidates postKeys.detail(slug), keeping
  // like/bookmark state fresh without a hard refresh on the post detail page.
  const likeMutation = useLikePost(post?.id ?? '', () => resolvedLiked, undefined, slug);
  const bookmarkMutation = useBookmarkPost(post?.id ?? '', () => resolvedBookmarked, slug);

  // FIX C-3 / M-7: sanitize on the client after post loads
  useEffect(() => {
    if (post?.content) {
      setSafeContent(sanitizeForDisplay(post.content));
    }
  }, [post?.content]);

  if (isLoading) return (
    <div className="max-w-[720px] mx-auto px-6 pt-32 pb-20 space-y-6">
      <Skeleton className="h-12 w-3/4 rounded-xl" />
      <Skeleton className="h-5 w-1/2 rounded" />
      <Skeleton className="h-72 w-full rounded-2xl" />
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4 w-full rounded" />)}
    </div>
  );

  if (!post) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="font-serif text-2xl text-muted_teal-300">Story not found</p>
      <Link href="/" className="text-[13px] text-muted_teal-500 hover:underline flex items-center gap-1.5">
        <ArrowLeft className="size-3.5" strokeWidth={1.5} /> Back to home
      </Link>
    </div>
  );

  const hasCover = !!post.coverImage;

  return (
    <>
      <ReadingProgress containerRef={articleRef} />
      <article ref={articleRef} className="min-h-screen">
        {hasCover ? (
          <div className="relative w-full h-[55vh] min-h-[360px] max-h-[560px] overflow-hidden">
            <Image src={post.coverImage!} alt={post.title} fill className="object-cover" priority />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 40%, ${PAGE_BG} 100%)` }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, transparent 80%, rgba(0,0,0,0.08) 100%)' }} />
          </div>
        ) : <div className="h-8" />}

        <div className={cn('max-w-[720px] mx-auto px-6 relative z-10 pb-24', hasCover ? '-mt-20' : 'mt-6')}>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map(({ tag }) => (
                <Link key={tag.id} href={`/explore?tag=${tag.slug}`} className="text-[10px] uppercase tracking-[0.15em] text-celadon-400 bg-celadon-500/15 hover:bg-celadon-500/25 rounded-full px-3 py-1 transition-colors duration-200">
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-[clamp(2rem,5vw,3rem)] leading-[1.1] tracking-[-0.03em] text-muted_teal-100 mb-6 text-balance"
          >
            {post.title}
          </motion.h1>

          <div className="flex items-center justify-between flex-wrap gap-4 mb-10 pb-8 border-b border-celadon-300/15">
            <Link href={`/${post.author.username}`} className="group flex items-center gap-3">
              <UserAvatar src={post.author.profile?.avatarUrl} name={post.author.profile?.displayName ?? post.author.username} username={post.author.username} size="md" />
              <div>
                <p className="text-[14px] font-semibold group-hover:text-muted_teal-500 transition-colors duration-200">
                  {post.author.profile?.displayName ?? post.author.username}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-muted_teal-300 mt-0.5">
                  <span>{formatDate(post.publishedAt)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="size-2.5" strokeWidth={1.5} />{formatReadingTime(post.readingTime)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Eye className="size-2.5" strokeWidth={1.5} />{formatNumber(post.viewCount)}</span>
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (!isAuthenticated) return;
                  const nowLiked = !resolvedLiked;
                  setLiked(nowLiked);
                  setDisplayLikeCount((displayLikeCount ?? post.likeCount) + (nowLiked ? 1 : -1));
                  likeMutation.mutate();
                }}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-all duration-200 focus:outline-none', resolvedLiked ? 'text-red-500 bg-red-50' : 'text-muted_teal-300 hover:text-red-500 hover:bg-red-50')}
              >
                <Heart className={cn('size-4', resolvedLiked && 'fill-current')} strokeWidth={1.5} />
                {formatNumber(likeCount)}
              </button>
              <Link href="#comments" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-muted_teal-300 hover:text-muted_teal-100 hover:bg-celadon-500/10 transition-all duration-200">
                <MessageCircle className="size-4" strokeWidth={1.5} />
                {formatNumber(post.commentCount)}
              </Link>
              <button
                onClick={() => { if (!isAuthenticated) return; setBookmarked(!resolvedBookmarked); bookmarkMutation.mutate(); }}
                className={cn('p-2 rounded-full transition-all duration-200 focus:outline-none', resolvedBookmarked ? 'text-celadon-400 bg-celadon-500/15' : 'text-muted_teal-300 hover:text-muted_teal-500 hover:bg-celadon-500/10')}
              >
                <Bookmark className={cn('size-4', resolvedBookmarked && 'fill-current')} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="p-2 rounded-full text-muted_teal-300 hover:text-muted_teal-100 hover:bg-celadon-500/10 transition-all duration-200 focus:outline-none"
              >
                <Share2 className="size-4" strokeWidth={1.5} />
              </button>
              {isAuthenticated && user?.id === post.author.id && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-celadon-300/15">
                  {showDeleteConfirm ? (
                    <>
                      <span className="text-[11px] text-red-500 mr-1">Delete?</span>
                      <button onClick={() => deleteMutation.mutate(post.id, { onSuccess: () => router.push('/dashboard') })} disabled={deleteMutation.isPending} className="px-2.5 py-1 rounded-full text-[11px] text-red-500 bg-red-50 hover:bg-red-100 transition-colors focus:outline-none">
                        {deleteMutation.isPending ? '…' : 'Yes'}
                      </button>
                      <button onClick={() => setShowDeleteConfirm(false)} className="px-2.5 py-1 rounded-full text-[11px] text-muted_teal-300 hover:bg-celadon-500/10 transition-colors focus:outline-none">
                        No
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-full text-muted_teal-300 hover:text-red-500 hover:bg-red-50 transition-colors focus:outline-none" title="Delete post">
                      <Trash2 className="size-4" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* FIX C-3 / M-7: render sanitized HTML, not raw post.content */}
          <div
            className="prose prose-teal prose-lg max-w-none font-serif text-muted_teal-100/90 leading-relaxed prose-headings:font-serif prose-headings:text-muted_teal-100 prose-a:text-celadon-400 prose-blockquote:border-l-celadon-400 prose-blockquote:text-muted_teal-300"
            dangerouslySetInnerHTML={{ __html: safeContent }}
          />

          {post.allowComments && <CommentsSection postId={post.id} />}
        </div>
      </article>
    </>
  );
}
