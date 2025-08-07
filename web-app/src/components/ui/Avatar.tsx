import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full border-2 border-[var(--color-border)]",
  {
    variants: {
      size: {
        sm: "h-6 w-6 text-xs",
        default: "h-8 w-8 text-sm",
        lg: "h-10 w-10 text-base",
        xl: "h-12 w-12 text-lg",
        "2xl": "h-16 w-16 text-xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  name?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, src, alt, fallback, name, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);
    
    // Generate initials from name
    const getInitials = (name?: string) => {
      if (!name) return '?';
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    // Generate a consistent color based on the name
    const getAvatarColor = (name?: string) => {
      if (!name) return 'var(--color-text-muted)';
      
      const colors = [
        'var(--color-primary-500)',
        'var(--color-secondary-500)',
        'var(--color-success-500)',
        'var(--color-warning-500)',
        'var(--color-error-500)',
        '#8B5CF6', // purple
        '#06B6D4', // cyan
        '#10B981', // emerald
        '#F59E0B', // amber
        '#EF4444', // red
      ];
      
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      return colors[Math.abs(hash) % colors.length];
    };

    const displayFallback = fallback || getInitials(name);
    const backgroundColor = getAvatarColor(name);

    return (
      <div
        ref={ref}
        className={cn(avatarVariants({ size, className }))}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center font-medium text-white"
            style={{ backgroundColor }}
          >
            {displayFallback}
          </div>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

// Avatar Group Component for showing multiple avatars
interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: VariantProps<typeof avatarVariants>['size'];
  children: React.ReactElement<AvatarProps>[];
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, max = 3, size = "default", children, ...props }, ref) => {
    const avatars = React.Children.toArray(children) as React.ReactElement<AvatarProps>[];
    const visibleAvatars = avatars.slice(0, max);
    const remainingCount = avatars.length - max;

    return (
      <div
        ref={ref}
        className={cn("flex -space-x-2", className)}
        {...props}
      >
        {visibleAvatars.map((avatar, index) =>
          React.cloneElement(avatar, {
            key: index,
            size,
            className: cn(
              "ring-2 ring-[var(--color-surface)] hover:z-10 transition-transform hover:scale-110",
              avatar.props.className
            ),
          })
        )}
        {remainingCount > 0 && (
          <Avatar
            size={size}
            fallback={`+${remainingCount}`}
            className="ring-2 ring-[var(--color-surface)] bg-[var(--color-text-muted)]"
          />
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = "AvatarGroup";

export { Avatar, AvatarGroup, avatarVariants };