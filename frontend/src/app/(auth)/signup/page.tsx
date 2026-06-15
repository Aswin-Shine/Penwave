'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { PenTool, ArrowRight, Loader2, Home } from 'lucide-react';
import { useSignup } from '@/hooks/use-auth';
import { useEffect, useRef } from 'react';

const schema = z.object({
  displayName: z.string().min(1, 'Name required').max(50),
  username: z.string().min(3, 'Min 3 chars').max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, _ and - only'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 chars').regex(/[A-Z]/, 'Needs uppercase').regex(/[0-9]/, 'Needs a number'),
});

type F = z.infer<typeof schema>;

export default function SignupPage() {
  const mutation = useSignup();
  const { register, handleSubmit, formState: { errors } } = useForm<F>({ resolver: zodResolver(schema) });
  
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationFrameId: number;

    const monitorLoop = () => {
      if (video) {
        const currentTime = video.currentTime;
        const duration = video.duration;

        if (duration > 0) {
          if (currentTime < 0.5) {
            video.style.opacity = (currentTime / 0.5).toString();
          } else if (duration - currentTime < 0.5) {
            video.style.opacity = ((duration - currentTime) / 0.5).toString();
          } else {
            video.style.opacity = '1';
          }
        }
      }
      animationFrameId = requestAnimationFrame(monitorLoop);
    };

    const handleVideoEnded = () => {
      if (video) {
        video.style.opacity = '0';
        setTimeout(() => {
          video.currentTime = 0;
          video.play().catch(() => {});
        }, 100);
      }
    };

    video.addEventListener('ended', handleVideoEnded);
    animationFrameId = requestAnimationFrame(monitorLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (video) {
        video.removeEventListener('ended', handleVideoEnded);
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-cream-900 flex flex-col md:flex-row font-sans">
      
      {/* LEFT: Cinematic Hero */}
      <div className="relative hidden md:flex w-full md:w-1/2 min-h-screen bg-muted_teal-100 overflow-hidden flex-col justify-between p-12 lg:p-16 text-cream-900 select-none">
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
            className="w-full h-full object-cover transition-opacity duration-100 ease-out pointer-events-none opacity-0"
            muted
            playsInline
            autoPlay
          />
          <div className="absolute inset-0 bg-gradient-to-b from-muted_teal-100/90 via-muted_teal-100/30 to-muted_teal-100/95 mix-blend-multiply z-10" />
        </div>

        <Link href="/" className="relative z-20 flex items-center gap-3 animate-fade-rise w-fit focus:outline-none">
          <div className="p-2.5 rounded-full bg-cream-900/10 backdrop-blur-md border border-cream-900/20">
            <PenTool className="h-5 w-5 text-cream-500" />
          </div>
          <span className="text-2xl font-normal font-serif tracking-tight text-cream-900">
            Penwave<sup className="text-[10px] ml-0.5 font-sans opacity-70">®</sup>
          </span>
        </Link>

        <div className="relative z-20 max-w-xl my-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-7xl font-normal font-serif text-cream-900 tracking-tight leading-[0.95]"
          >
            Beyond <span className="italic text-muted_teal-400">silence</span>, we build the <span className="italic text-muted_teal-400">eternal</span>.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-sm sm:text-base text-muted_teal-900/70 max-w-sm mt-6 font-light leading-relaxed"
          >
            Every great writer started with a single story. Start yours today on Penwave.
          </motion.p>
        </div>

        <div className="relative z-20 opacity-40 text-xs animate-fade-rise">
          © 2026 Penwave Platform Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT: Form */}
      <div className="w-full md:w-1/2 min-h-screen bg-cream-900 flex items-center justify-center p-8 lg:p-24 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md space-y-10"
        >
          <Link href="/" className="flex items-center gap-2 md:hidden mb-8 focus:outline-none">
            <div className="p-2 rounded-full bg-muted_teal-100 text-cream-900">
              <PenTool className="h-4 w-4" />
            </div>
            <span className="font-serif text-xl tracking-tight text-muted_teal-100">Penwave</span>
          </Link>

          <div className="space-y-3">
            <h2 className="text-4xl lg:text-5xl font-serif font-normal text-muted_teal-100 tracking-tight">
              Create account
            </h2>
            <p className="text-sm text-muted_teal-300 font-light">
              Your story starts here.
            </p>
          </div>

          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6">
            <div className="space-y-5">
              {[
                { name: 'displayName' as const, label: 'Full name', type: 'text', placeholder: 'e.g. Jane Smith' },
                { name: 'username' as const, label: 'Username', type: 'text', placeholder: 'janesmith' },
                { name: 'email' as const, label: 'Email address', type: 'email', placeholder: 'you@example.com' },
                { name: 'password' as const, label: 'Password', type: 'password', placeholder: '••••••••••••' },
              ].map(f => (
                <div key={f.name} className="relative border-b border-celadon-300/60 focus-within:border-muted_teal-500 transition-colors duration-300 py-1">
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted_teal-300/80 mb-1">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    className="w-full bg-transparent text-muted_teal-100 font-normal text-base placeholder-muted_teal-300/40 focus:outline-none pb-1.5"
                    {...register(f.name)}
                    disabled={mutation.isPending}
                  />
                  {errors[f.name] && <p className="absolute -bottom-5 text-[11px] text-red-500/80">{errors[f.name]?.message}</p>}
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full mt-6 bg-muted_teal-100 hover:bg-muted_teal-200 text-cream-900 group font-medium text-sm rounded-full py-4 px-6 flex items-center justify-center gap-2 transition-all duration-300 ease-out transform active:scale-[0.98] hover:-translate-y-0.5 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-cream-500" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                </>
              )}
            </button>
          </form>

          <div className="space-y-4 pt-2">
            <div className="text-center">
              <p className="text-sm text-muted_teal-300 font-light">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-muted_teal-100 hover:text-muted_teal-500 underline underline-offset-4 transition-colors duration-200">
                  Sign in
                </Link>
              </p>
            </div>
            {/* Back to homepage link — matching login page */}
            <div className="text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-[12px] text-muted_teal-300/70 hover:text-muted_teal-300 transition-colors duration-200"
              >
                <Home className="h-3 w-3" />
                Back to homepage
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
