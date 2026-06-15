import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted_teal-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-muted_teal-100 text-cream-900 rounded-full hover:bg-muted_teal-200 shadow-sm active:scale-[0.98]',
        outline: 'border border-celadon-300/25 text-muted_teal-300 rounded-full hover:text-muted_teal-100 hover:border-celadon-300/40 hover:bg-celadon-500/8',
        ghost: 'text-muted_teal-300 rounded-full hover:text-muted_teal-100 hover:bg-celadon-500/10',
        muted: 'bg-celadon-500/10 text-muted_teal-300 rounded-full hover:bg-celadon-500/20',
        destructive: 'bg-rose-500 text-white rounded-full hover:bg-rose-600 shadow-sm',
        link: 'text-muted_teal-500 underline-offset-4 hover:underline p-0 h-auto',
        secondary: 'bg-beige-500 text-muted_teal-100 rounded-full hover:bg-beige-400 shadow-sm',
      },
      size: {
        default: 'h-9 px-5 py-2 text-[13px]',
        sm: 'h-8 px-4 text-[12px]',
        lg: 'h-11 px-7 text-[14px]',
        xl: 'h-12 px-8 text-[15px]',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} disabled={disabled ?? loading} {...props}>
        {loading ? <><span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />{children}</> : children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';
export { Button, buttonVariants };
