'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOpacity, setVideoOpacity] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuthStore();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  // Cinematic video fade loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let frameId: number;

    const updateOpacity = () => {
      if (!video.duration) {
        frameId = requestAnimationFrame(updateOpacity);
        return;
      }

      const fadeDuration = 0.5;
      const current = video.currentTime;
      const duration = video.duration;

      if (current < fadeDuration) {
        setVideoOpacity(current / fadeDuration);
      } else if (current > duration - fadeDuration) {
        setVideoOpacity((duration - current) / fadeDuration);
      } else {
        setVideoOpacity(1);
      }

      frameId = requestAnimationFrame(updateOpacity);
    };

    updateOpacity();

    const handleEnded = () => {
      setVideoOpacity(0);
      setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
      }, 100);
    };

    video.addEventListener('ended', handleEnded);

    return () => {
      cancelAnimationFrame(frameId);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full h-screen min-h-[640px] overflow-hidden flex items-center justify-center -mt-[72px]"
    >
      {/* Video background */}
      <motion.div className="absolute inset-0 z-0" style={{ y }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: videoOpacity, transition: 'opacity 0.1s linear' }}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
        />
      </motion.div>

      {/* Atmospheric overlays */}
      <div className="absolute inset-0 z-10 bg-cream-900/40" />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-[#f8faf4]" />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-transparent via-transparent to-[#f8faf4]/30" />

      {/* Ambient color wash */}
      <div className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(189,216,189,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <motion.div
        className="relative z-20 text-center px-6 max-w-4xl mx-auto"
        style={{ y: textY, opacity }}
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          <div className="h-px w-12 bg-muted_teal-500/60" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted_teal-500 font-medium">
            Thoughtful publishing
          </span>
          <div className="h-px w-12 bg-muted_teal-500/60" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-[clamp(2.6rem,7vw,5.5rem)] leading-[1.05] tracking-[-0.03em] text-muted_teal-100 mb-6"
        >
          Beyond noise,{' '}
          <em className="not-italic text-muted_teal-300">stories</em>
          <br />
          become{' '}
          <em className="italic text-muted_teal-500">timeless.</em>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-muted_teal-300 text-lg leading-relaxed max-w-lg mx-auto mb-10"
        >
          Penwave is a sanctuary for thoughtful writing, deep ideas,
          and meaningful digital publishing.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          <Link
            href={isAuthenticated ? '/editor' : '/signup'}
            className="group flex items-center gap-2 px-7 py-3 rounded-full bg-muted_teal-100 text-cream-900 text-sm font-medium hover:bg-muted_teal-100/85 transition-all duration-300 shadow-lg"
          >
            Start Writing
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.5} />
          </Link>
          <Link
            href="/explore"
            className="flex items-center gap-2 px-7 py-3 rounded-full glass text-muted_teal-100 text-sm font-medium hover:bg-cream-900/60 transition-all duration-300"
          >
            Explore Stories
          </Link>
        </motion.div>

        {/* Floating metadata */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.1 }}
          className="flex items-center justify-center gap-8 mt-14 text-[11px] text-muted_teal-300/70 tracking-wide"
        >
          {['10K+ writers', 'Deep reading', 'No algorithm'].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
      >
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted_teal-300/70">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-[#7d8782]/50 to-transparent animate-scroll-bounce" />
      </motion.div>
    </section>
  );
}
