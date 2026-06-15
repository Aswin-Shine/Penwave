import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border text-[10px] font-medium uppercase tracking-[0.1em] transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-muted_teal-100 text-cream-900 px-2.5 py-0.5',
        secondary: 'border-transparent bg-[#dde7c7] text-muted_teal-100 px-2.5 py-0.5',
        destructive: 'border-transparent bg-rose-500 text-white px-2.5 py-0.5',
        outline: 'border-celadon-300/25 text-muted_teal-300 px-2.5 py-0.5',
        muted: 'border-transparent bg-black/6 text-muted_teal-300 px-2.5 py-0.5',
        tag: 'border-transparent bg-celadon-500/15 text-muted_teal-500 hover:bg-celadon-500/25 cursor-pointer px-2.5 py-0.5',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
