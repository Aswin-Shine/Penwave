import type { Metadata } from 'next';
import { PostDetail } from '@/features/posts/post-detail';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(
      `${process.env.BACKEND_URL ?? 'http://localhost:4000/api'}/posts/${slug}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return { title: 'Post not found' };
    const data = await res.json();
    const post = data.data;
    const authorName = post.author?.profile?.displayName ?? post.author?.username ?? 'Penwave';
    return {
      title: `${post.title} — by ${authorName}`,
      description: post.excerpt ?? post.metaDescription,
      openGraph: {
        title: post.title,
        description: post.excerpt,
        images: post.coverImage ? [{ url: post.coverImage }] : [],
        type: 'article',
        authors: [authorName],
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.excerpt,
      },
    };
  } catch {
    return { title: 'Post — Penwave' };
  }
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  return <PostDetail slug={slug} />;
}