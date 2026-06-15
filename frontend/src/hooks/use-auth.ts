import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService, type LoginPayload, type SignupPayload } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';

// FIX C-1 / H-6: login() now takes only the user — no accessToken parameter.
export function useLogin() {
  const { login } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (res) => {
      if (res.data) {
        login(res.data.user);
        addToast({ title: `Welcome back, ${res.data.user.profile?.displayName ?? res.data.user.username}!`, variant: 'success' });
        router.push('/');
      }
    },
    onError: (err: Error) => addToast({ title: 'Login failed', description: err.message, variant: 'error' }),
  });
}

export function useSignup() {
  const { login } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: SignupPayload) => authService.signup(payload),
    onSuccess: (res) => {
      if (res.data) {
        login(res.data.user);
        addToast({ title: 'Account created!', variant: 'success' });
        router.push('/');
      }
    },
    onError: (err: Error) => addToast({ title: 'Signup failed', description: err.message, variant: 'error' }),
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      logout();
      queryClient.clear();
      router.push('/login');
    },
    onError: () => {
      // Force local logout even if API fails
      logout();
      queryClient.clear();
      router.push('/login');
    },
  });
}
