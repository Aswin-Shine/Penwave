import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn, getInitials } from '@/lib/utils';

const AvatarRoot = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root ref={ref} className={cn('relative flex shrink-0 overflow-hidden rounded-full', className)} {...props} />
));
AvatarRoot.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn('aspect-square h-full w-full object-cover', className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('flex h-full w-full items-center justify-center rounded-full bg-[#bfd8bd] text-[#111] font-medium', className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Palette derived from username char code — stays within organic palette
const PALETTE = [
  '#bfd8bd', '#98c9a3', '#77bfa3', '#dde7c7', '#edeec9',
  '#b8d4c0', '#9ec8aa', '#88c4a8', '#c8dfc6', '#aac9b0',
];

function getFallbackBg(username: string): string {
  const idx = username.charCodeAt(0) % PALETTE.length;
  return PALETTE[idx] ?? '#bfd8bd';
}

interface UserAvatarProps {
  src?: string | null;
  name: string;
  username?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-[11px]',
  md: 'size-10 text-[12px]',
  lg: 'size-14 text-[14px]',
  xl: 'size-20 text-[17px]',
};

export function UserAvatar({ src, name, username = name, size = 'md', className }: UserAvatarProps) {
  return (
    <AvatarRoot className={cn(sizeMap[size], className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback style={{ backgroundColor: getFallbackBg(username) }}>
        {getInitials(name)}
      </AvatarFallback>
    </AvatarRoot>
  );
}

export { AvatarRoot, AvatarImage, AvatarFallback };
