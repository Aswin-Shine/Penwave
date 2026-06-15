import { create } from 'zustand';
import type { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  login: (user: AuthUser) => void;
  logout: () => void;
}

/**
 * Auth store — persistence removed.
 *
 * Previously: user object was persisted to localStorage via zustand/persist.
 * Problem: persisted user becomes permanently stale if the account is
 * deactivated, role changes, or profile is updated in another tab/device.
 * The role field in particular should never come from localStorage since it
 * gates client-side UI decisions.
 *
 * Now: /auth/me (called by AuthInitializer on every page load) is the sole
 * source of truth. The store holds in-memory state only for the current
 * session. isLoading=true until AuthInitializer resolves, preventing flash
 * of unauthenticated UI.
 *
 * Trade-off: brief loading state on initial render (handled in AuthInitializer
 * by rendering a spinner until init() resolves) instead of instant stale UI.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // true on mount — AuthInitializer sets false after /auth/me

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),

  login: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
}));
