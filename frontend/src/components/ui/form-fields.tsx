import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

const baseCls = 'flex w-full rounded-2xl border border-celadon-300/20 bg-cream-900/60 px-4 text-[14px] placeholder:text-muted_teal-300/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted_teal-500/40 focus-visible:border-muted_teal-500/60 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { error?: string; }
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => (
  <div className="w-full">
    <input className={cn(baseCls, 'h-11 py-2', error && 'border-rose-400 focus-visible:ring-rose-400/40', className)} ref={ref} {...props} />
    {error && <p className="mt-1 text-[12px] text-rose-500">{error}</p>}
  </div>
));
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { error?: string; }
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error, ...props }, ref) => (
  <div className="w-full">
    <textarea className={cn(baseCls, 'py-3 resize-none', error && 'border-rose-400', className)} ref={ref} {...props} />
    {error && <p className="mt-1 text-[12px] text-rose-500">{error}</p>}
  </div>
));
Textarea.displayName = 'Textarea';

const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <LabelPrimitive.Root ref={ref} className={cn('block text-[12px] font-medium text-muted_teal-300 uppercase tracking-[0.08em] mb-1.5 peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)} {...props} />
  )
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Input, Textarea, Label };
