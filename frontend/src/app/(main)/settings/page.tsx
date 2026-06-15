'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useUserProfile } from '@/hooks/use-data';
import { usersService } from '@/services/index';
import { useUIStore } from '@/store/ui.store';
import type { UserProfile } from '@/types';

const schema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(60),
  bio: z.string().max(300).optional().or(z.literal('')),
  location: z.string().max(100).optional().or(z.literal('')),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  twitterUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  linkedinUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  avatarUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  coverUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-wider text-muted_teal-300/80 font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-muted_teal-300/50">{hint}</p>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

const inputClass =
  'w-full bg-transparent border-b border-celadon-300/40 text-sm text-muted_teal-100 ' +
  'placeholder-muted_teal-300/40 focus:outline-none focus:border-muted_teal-500 pb-1.5 transition-colors';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const queryClient = useQueryClient();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (user === null) {
      router.replace('/login');
    }
  }, [user, router]);

  const { data: profile, isLoading } = useUserProfile(user?.username ?? '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: '',
      bio: '',
      location: '',
      website: '',
      twitterUrl: '',
      githubUrl: '',
      linkedinUrl: '',
      avatarUrl: '',
      coverUrl: '',
    },
  });

  // Populate form once profile loads
  useEffect(() => {
    if (profile?.profile) {
      reset({
        displayName: profile.profile.displayName ?? '',
        bio: profile.profile.bio ?? '',
        location: profile.profile.location ?? '',
        website: profile.profile.website ?? '',
        twitterUrl: profile.profile.twitterUrl ?? '',
        githubUrl: profile.profile.githubUrl ?? '',
        linkedinUrl: profile.profile.linkedinUrl ?? '',
        avatarUrl: profile.profile.avatarUrl ?? '',
        coverUrl: profile.profile.coverUrl ?? '',
      });
    }
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) => usersService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', user?.username] });
      addToast({ title: 'Profile updated', variant: 'success' });
      router.push(`/${user?.username}`);
    },
    onError: (err: Error) => {
      addToast({ title: err.message ?? 'Failed to update profile', variant: 'error' });
    },
  });

  const onSubmit = (values: FormValues) => {
    // Strip empty strings → null so backend handles them correctly
    const payload = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])
    ) as Partial<UserProfile>;
    mutation.mutate(payload);
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted_teal-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-900 text-muted_teal-100 pb-24">
      {/* Header */}
      <div className="sticky top-[72px] z-40 bg-cream-900/90 backdrop-blur-md border-b border-celadon-300/10">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-muted_teal-300 hover:text-muted_teal-100 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <span className="text-sm font-medium text-muted_teal-100">Edit Profile</span>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={mutation.isPending || !isDirty}
            className="bg-muted_teal-100 hover:bg-muted_teal-200 disabled:opacity-40 text-cream-900 font-medium text-xs tracking-wider uppercase px-5 py-2.5 rounded-full flex items-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Basics */}
        <section className="space-y-6">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500">Basics</h2>

          <Field label="Display name" error={errors.displayName?.message}>
            <input
              {...register('displayName')}
              placeholder="Your name"
              className={inputClass}
            />
          </Field>

          <Field label="Bio" error={errors.bio?.message} hint="Max 300 characters">
            <textarea
              {...register('bio')}
              rows={3}
              placeholder="Tell readers a bit about yourself…"
              className="w-full bg-transparent border border-celadon-300/20 rounded-xl text-sm text-muted_teal-100 placeholder-muted_teal-300/40 focus:outline-none focus:border-muted_teal-500 p-3 resize-none transition-colors"
            />
          </Field>

          <Field label="Location" error={errors.location?.message}>
            <input
              {...register('location')}
              placeholder="City, Country"
              className={inputClass}
            />
          </Field>
        </section>

        <div className="h-px bg-celadon-300/15" />

        {/* Images */}
        <section className="space-y-6">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500">Images</h2>

          <Field
            label="Avatar URL"
            error={errors.avatarUrl?.message}
            hint="Link to your profile picture"
          >
            <input
              {...register('avatarUrl')}
              placeholder="https://..."
              className={inputClass}
            />
          </Field>

          <Field
            label="Cover image URL"
            error={errors.coverUrl?.message}
            hint="Shown at the top of your profile"
          >
            <input
              {...register('coverUrl')}
              placeholder="https://..."
              className={inputClass}
            />
          </Field>
        </section>

        <div className="h-px bg-celadon-300/15" />

        {/* Links */}
        <section className="space-y-6">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted_teal-500">Links</h2>

          <Field label="Website" error={errors.website?.message}>
            <input
              {...register('website')}
              placeholder="https://yoursite.com"
              className={inputClass}
            />
          </Field>

          <Field label="Twitter / X" error={errors.twitterUrl?.message}>
            <input
              {...register('twitterUrl')}
              placeholder="https://twitter.com/username"
              className={inputClass}
            />
          </Field>

          <Field label="GitHub" error={errors.githubUrl?.message}>
            <input
              {...register('githubUrl')}
              placeholder="https://github.com/username"
              className={inputClass}
            />
          </Field>

          <Field label="LinkedIn" error={errors.linkedinUrl?.message}>
            <input
              {...register('linkedinUrl')}
              placeholder="https://linkedin.com/in/username"
              className={inputClass}
            />
          </Field>
        </section>
      </div>
    </div>
  );
}
