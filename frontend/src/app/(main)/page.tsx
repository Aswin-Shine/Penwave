import type { Metadata } from 'next';
import { HeroSection } from '@/features/posts/hero-section';
import { HomeFeed } from '@/features/posts/home-feed';

export const metadata: Metadata = {
  title: 'Penwave — Beyond noise, stories become timeless.',
  description: 'A sanctuary for thoughtful writing, deep ideas, and meaningful digital publishing.',
};

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <HomeFeed />
    </div>
  );
}
