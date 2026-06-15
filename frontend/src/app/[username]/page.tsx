'use client';

import Image from 'next/image';
import Link from 'next/link';
import { use, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Globe, Twitter, Github, Linkedin, Calendar } from 'lucide-react';
import { useUserProfile, useFollow } from '@/hooks/use-data';
import { useUserPosts } from '@/hooks/use-posts';
import { useAuthStore } from '@/store/auth.store';
import { UserAvatar } from '@/components/ui/avatar';
import { PostCard } from '@/components/post/post-card';
import { PostCardSkeleton, ProfileSkeleton } from '@/components/ui/skeleton';
import { FollowListModal } from '@/components/profile/follow-list-modal';
import { formatDate, formatNumber } from '@/lib/utils';

type FollowTab = 'followers' | 'following' | null;

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user: me } = useAuthStore();
  const { data: profile, isLoading: profileLoading } = useUserProfile(username);
  const { data: userPostsData, isLoading: postsLoading } = useUserPosts(username);
  const posts = userPostsData?.data ?? [];
  const followMutation = useFollow(username, profile?.isFollowing ?? false);
  const isOwn = me?.username === username;

  const [followTab, setFollowTab] = useState<FollowTab>(null);
  const closeModal = useCallback(() => setFollowTab(null), []);

  if (profileLoading) return <ProfileSkeleton />;
  if (!profile) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="font-serif text-2xl text-muted_teal-300">User not found</p>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Cover */}
      <div className="relative h-56 md:h-72 -mt-[72px]">
        {profile.profile?.coverUrl ? (
          <Image src={profile.profile.coverUrl} alt="Cover" fill className="object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: 'linear-gradient(135deg, #dde7c7 0%, #bfd8bd 50%, #98c9a3 100%)' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#fbfcf4]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {/* Avatar + actions */}
        <div className="flex items-end justify-between mb-6 relative z-10 -mt-12">
          <UserAvatar
            src={profile.profile?.avatarUrl}
            name={profile.profile?.displayName ?? profile.username}
            username={profile.username}
            size="xl"
            className="border-4 border-[#fbfcf4] shadow-lg"
          />
          {isOwn ? (
            <Link
              href="/settings"
              className="px-5 py-2 rounded-full border border-celadon-300/25 text-[13px] font-medium text-muted_teal-300 hover:text-muted_teal-100 hover:border-celadon-300/30 transition-all duration-200 bg-[#fbfcf4]"
            >
              Edit profile
            </Link>
          ) : (
            <button
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
                profile.isFollowing
                  ? 'border border-celadon-300/25 text-muted_teal-300 hover:border-celadon-300/30 bg-[#fbfcf4]'
                  : 'bg-muted_teal-100 text-cream-900 hover:bg-muted_teal-200'
              }`}
            >
              {profile.isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
        </div>

        {/* Bio */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <h1 className="font-serif text-[2rem] tracking-[-0.02em] mb-0.5">
            {profile.profile?.displayName ?? profile.username}
          </h1>
          <p className="text-[14px] text-muted_teal-300/70 mb-3">@{profile.username}</p>
          {profile.profile?.bio && (
            <p className="text-[15px] text-muted_teal-300 leading-relaxed max-w-lg mb-4">
              {profile.profile.bio}
            </p>
          )}
          <div className="flex flex-wrap gap-4 text-[12px] text-muted_teal-300/70">
            {profile.profile?.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" strokeWidth={1.5} />{profile.profile.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" strokeWidth={1.5} />Joined {formatDate(profile.createdAt)}
            </span>
            {profile.profile?.website && (
              <a href={profile.profile.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-muted_teal-500 transition-colors duration-200">
                <Globe className="size-3.5" strokeWidth={1.5} />
                {new URL(profile.profile.website).hostname}
              </a>
            )}
            {profile.profile?.twitterUrl && (
              <a href={profile.profile.twitterUrl} target="_blank" rel="noopener noreferrer"
                className="hover:text-muted_teal-500 transition-colors duration-200">
                <Twitter className="size-3.5" strokeWidth={1.5} />
              </a>
            )}
            {profile.profile?.githubUrl && (
              <a href={profile.profile.githubUrl} target="_blank" rel="noopener noreferrer"
                className="hover:text-muted_teal-500 transition-colors duration-200">
                <Github className="size-3.5" strokeWidth={1.5} />
              </a>
            )}
            {profile.profile?.linkedinUrl && (
              <a href={profile.profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                className="hover:text-muted_teal-500 transition-colors duration-200">
                <Linkedin className="size-3.5" strokeWidth={1.5} />
              </a>
            )}
          </div>
        </motion.div>

        {/* Stats — Posts is just a number, Followers/Following are clickable */}
        <div className="flex gap-8 py-5 mb-10 border-t border-b border-celadon-300/15">
          {/* Posts — not clickable, no modal */}
          <div>
            <p className="font-serif text-2xl tracking-[-0.02em]">
              {formatNumber(profile._count?.posts ?? 0)}
            </p>
            <p className="text-[11px] text-muted_teal-300/70 uppercase tracking-[0.1em] mt-0.5">Posts</p>
          </div>

          {/* Followers — clickable */}
          <button
            onClick={() => setFollowTab('followers')}
            className="text-left group"
          >
            <p className="font-serif text-2xl tracking-[-0.02em] group-hover:text-muted_teal-500 transition-colors duration-200">
              {formatNumber(profile._count?.followers ?? 0)}
            </p>
            <p className="text-[11px] text-muted_teal-300/70 uppercase tracking-[0.1em] mt-0.5 group-hover:text-muted_teal-500 transition-colors duration-200">
              Followers
            </p>
          </button>

          {/* Following — clickable */}
          <button
            onClick={() => setFollowTab('following')}
            className="text-left group"
          >
            <p className="font-serif text-2xl tracking-[-0.02em] group-hover:text-muted_teal-500 transition-colors duration-200">
              {formatNumber(profile._count?.following ?? 0)}
            </p>
            <p className="text-[11px] text-muted_teal-300/70 uppercase tracking-[0.1em] mt-0.5 group-hover:text-muted_teal-500 transition-colors duration-200">
              Following
            </p>
          </button>
        </div>

        {/* Posts */}
        <div className="pb-16">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500 mb-6">Stories</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {postsLoading
              ? Array.from({ length: 4 }).map((_, i) => <PostCardSkeleton key={i} />)
              : posts.length === 0
                ? (
                  <p className="col-span-2 py-16 text-center text-muted_teal-300/70 text-[14px]">
                    No published stories yet
                  </p>
                )
                : posts.map(post => <PostCard key={post.id} post={post} />)
            }
          </div>
        </div>
      </div>

      {/* Follow list modal — rendered outside the content flow so it can overlay everything */}
      <FollowListModal
        username={username}
        tab={followTab}
        onClose={closeModal}
      />
    </div>
  );
}
