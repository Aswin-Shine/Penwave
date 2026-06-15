'use client';

import { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import type { AuthUser } from '@/types';

/**
 * AuthInitializer — calls /auth/me once on mount to hydrate auth state.
 *
 * Renders a minimal full-screen loader until init() resolves, preventing:
 *   1. Flash of unauthenticated navbar (like/bookmark buttons showing disabled)
 *   2. Duplicate data fetches from components that check isAuthenticated
 *
 * The loader is intentionally bare — no layout, no branding — to avoid
 * content shift. Replace with a skeleton if desired.
 */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { login, logout, setLoading, isLoading } = useAuthStore();
  const initRan = useRef(false);

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;

    async function init() {
      setLoading(true);
      try {
        const { data } = await api.get<AuthUser>('/auth/me');
        if (data) login(data);
        else logout();
      } catch (err) {
        if (err instanceof ApiError && err.status !== 401) {
          console.warn('Auth init failed:', err.message);
        }
        logout();
      }
      // setLoading(false) is called by login() and logout() above
    }

    init();
  }, [login, logout, setLoading]);

  // Block render until we know auth state.
  // This prevents the navbar from flashing unauthenticated on every page load.
  if (isLoading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--background, #fff)',
        }}
        aria-label="Loading"
      />
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: (count, err) => {
          const status = (err as { status?: number }).status;
          if (status === 404 || status === 401) return false;
          return count < 2;
        },
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <AuthInitializer>{children}</AuthInitializer>
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
