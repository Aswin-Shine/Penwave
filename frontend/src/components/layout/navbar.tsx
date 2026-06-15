'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { PenLine, Search, Bell, FileText } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/use-auth';
import { useUnreadNotificationCount } from '@/hooks/use-data';
import { UserAvatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/explore', label: 'Explore' },
  { href: '/trending', label: 'Trending' },
];

export function Navbar() {
  const { user, isAuthenticated } = useAuthStore();
  const logout = useLogout();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { scrollY } = useScroll();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24));

  // Fix 7: Use ref-based outside click instead of document listener race condition
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (!profileOpen) return;
    // Use setTimeout to let the current click event fully complete first
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.nav
        className={cn(
          'flex items-center justify-between gap-6 rounded-full px-6 py-3 transition-all duration-500 w-full max-w-7xl mx-auto',
          scrolled
            ? 'bg-cream-900/80 backdrop-blur-xl border border-celadon-300/30 shadow-[0_20px_40px_-15px_rgba(20,42,34,0.05)]'
            : 'bg-transparent border border-transparent'
        )}
      >
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group focus:outline-none">
            <div className="p-2 rounded-full bg-muted_teal-100 text-cream-900 group-hover:scale-105 transition-transform duration-300">
              <PenLine className="h-4 w-4" />
            </div>
            <span className="text-2xl font-serif font-normal tracking-tight text-muted_teal-100">
              Penwave<sup className="text-[9px] font-sans opacity-60 ml-0.5">®</sup>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 border-l border-celadon-300/30 pl-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
                  pathname === link.href
                    ? 'text-muted_teal-100 bg-celadon-500/10'
                    : 'text-muted_teal-300 hover:text-muted_teal-100 hover:bg-celadon-500/5'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/search"
            className="p-2 text-muted_teal-300 hover:text-muted_teal-100 transition-colors duration-200 rounded-full hover:bg-celadon-500/10 md:flex items-center gap-2 text-xs font-medium focus:outline-none"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline opacity-60">Search flows...</span>
          </Link>

          {isAuthenticated && user ? (
            <>
              <Link
                href="/notifications"
                className="relative p-2 text-muted_teal-300 hover:text-muted_teal-100 transition-colors duration-200 rounded-full hover:bg-celadon-500/10"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-1.5 bg-muted_teal-500 rounded-full" />
                )}
              </Link>

              <div className="h-4 w-[1px] bg-celadon-300/30 mx-2" />

              {/* Fix 7: ref-based dropdown, no document listener race */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen(prev => !prev)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
                >
                  <UserAvatar
                    src={user.profile?.avatarUrl}
                    name={user.profile?.displayName ?? user.username}
                    username={user.username}
                    size="sm"
                  />
                </button>

                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-full mt-4 w-56 bg-cream-900 border border-celadon-300/30 rounded-2xl shadow-[0_20px_40px_-15px_rgba(20,42,34,0.1)] overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-celadon-300/20">
                      <p className="text-sm font-semibold text-muted_teal-100">
                        {user.profile?.displayName ?? user.username}
                      </p>
                      <p className="text-xs text-muted_teal-300">@{user.username}</p>
                    </div>
                    <div className="p-2 space-y-1">
                      <Link
                        href={`/${user.username}`}
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-2 text-sm text-muted_teal-100 hover:bg-celadon-500/10 rounded-lg transition-colors"
                      >
                        Profile
                      </Link>
                      <Link
                        href="/dashboard"
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-2 text-sm text-muted_teal-100 hover:bg-celadon-500/10 rounded-lg transition-colors"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/bookmarks"
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-2 text-sm text-muted_teal-100 hover:bg-celadon-500/10 rounded-lg transition-colors"
                      >
                        Bookmarks
                      </Link>

                      <div className="h-px bg-celadon-300/20 mx-2 my-1" />
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          logout.mutate();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              <Link
                href="/editor"
                className="hidden md:flex bg-muted_teal-100 hover:bg-muted_teal-200 text-cream-900 font-medium text-xs tracking-wide rounded-full px-5 py-2.5 items-center gap-1.5 transition-all duration-300 transform active:scale-95 hover:-translate-y-0.5"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Write</span>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-xs font-semibold tracking-wide uppercase text-muted_teal-100 hover:text-muted_teal-500 transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-muted_teal-100 hover:bg-muted_teal-200 text-cream-900 font-medium text-xs tracking-wide rounded-full px-5 py-2.5 transition-all duration-300 transform active:scale-95 hover:-translate-y-0.5"
              >
                Begin Journey
              </Link>
            </div>
          )}
        </div>
      </motion.nav>
    </motion.header>
  );
}