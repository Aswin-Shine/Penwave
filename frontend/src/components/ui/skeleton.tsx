import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} {...props} />;
}

export function PostCardSkeleton() {
  return (
    <div className="rounded-2xl border border-celadon-300/15 bg-cream-900/70 overflow-hidden">
      <div className="skeleton aspect-[16/10]" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-14 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-5/6 rounded-lg" />
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-4/5 rounded-lg" />
        <div className="flex items-center gap-2 pt-2 border-t border-celadon-300/10">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Matches -mt-[72px] cover in profile page */}
      <div className="h-56 md:h-72 -mt-[72px] skeleton" />
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-end justify-between -mt-12 mb-6">
          <Skeleton className="size-24 rounded-full border-4 border-[#fbfcf4]" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        <div className="space-y-2 mb-8">
          <Skeleton className="h-8 w-44 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <div className="flex gap-8 py-5 mb-10 border-t border-b border-celadon-300/15">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-7 w-10 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
