import { api } from '@/lib/api-client';
import type { AuthUser } from '@/types';

export interface LoginPayload { email: string; password: string; }
export interface SignupPayload { email: string; username: string; password: string; displayName: string; }

// FIX C-1: AuthResponse no longer contains accessToken.
// The token is set as an httpOnly cookie by the backend — never returned in body.
export interface AuthResponse { user: AuthUser; }

export const authService = {
  signup: (payload: SignupPayload) => api.post<AuthResponse>('/auth/signup', payload),
  login: (payload: LoginPayload) => api.post<AuthResponse>('/auth/login', payload),
  logout: () => api.post<null>('/auth/logout'),
  me: () => api.get<AuthUser>('/auth/me'),
  refresh: () => api.post<null>('/auth/refresh'),
};
