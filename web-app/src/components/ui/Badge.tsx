import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)]",
        secondary: "border-transparent bg-[var(--color-text-muted)] text-white hover:bg-[var(--color-text-secondary)]",
        success: "border-transparent bg-[var(--color-success-500)] text-white hover:bg-[var(--color-success-600)]",
        warning: "border-transparent bg-[var(--color-warning-500)] text-white hover:bg-[var(--color-warning-600)]",
        error: "border-transparent bg-[var(--color-error-500)] text-white hover:bg-[var(--color-error-600)]",
        outline: "border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]",
        // Status-specific variants
        todo: "border-transparent bg-[var(--color-status-todo)] text-white",
        progress: "border-transparent bg-[var(--color-status-progress)] text-white",
        review: "border-transparent bg-[var(--color-status-review)] text-white",
        done: "border-transparent bg-[var(--color-status-done)] text-white",
        // Priority variants
        urgent: "border-transparent bg-[var(--color-error-500)] text-white animate-pulse-priority",
        high: "border-transparent bg-[var(--color-warning-500)] text-white",
        normal: "border-transparent bg-[var(--color-primary-500)] text-white",
        low: "border-transparent bg-[var(--color-text-muted)] text-white",
        none: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  dot?: boolean;
}

function Badge({ className, variant, size, icon, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      )}
      {icon && <span className="w-3 h-3">{icon}</span>}
      {children}
    </div>
  );
}

// Status Badge Component
interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: string;
  color?: string;
}

function StatusBadge({ status, color, className, ...props }: StatusBadgeProps) {
  const getStatusVariant = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '');
    
    switch (normalizedStatus) {
      case 'todo':
      case 'open':
      case 'new':
        return 'todo';
      case 'inprogress':
      case 'active':
      case 'working':
        return 'progress';
      case 'inreview':
      case 'review':
      case 'testing':
        return 'review';
      case 'done':
      case 'completed':
      case 'closed':
      case 'finished':
        return 'done';
      default:
        return 'default';
    }
  };

  const variant = getStatusVariant(status);
  
  return (
    <Badge
      variant={variant}
      className={cn("uppercase tracking-wide font-medium", className)}
      style={color ? { backgroundColor: color } : undefined}
      {...props}
    >
      {status}
    </Badge>
  );
}

// Priority Badge Component
interface PriorityBadgeProps extends Omit<BadgeProps, 'variant'> {
  priority: string;
  color?: string;
}

function PriorityBadge({ priority, color, className, ...props }: PriorityBadgeProps) {
  const getPriorityVariant = (priority: string) => {
    const normalizedPriority = priority.toLowerCase();
    
    switch (normalizedPriority) {
      case 'urgent':
      case 'critical':
        return 'urgent';
      case 'high':
        return 'high';
      case 'medium':
      case 'normal':
        return 'normal';
      case 'low':
        return 'low';
      case 'clear':
      case 'none':
      case '':
        return 'none';
      default:
        return 'none';
    }
  };

  const variant = getPriorityVariant(priority);
  
  // Display "None" for clear/empty priorities
  const displayText = priority.toLowerCase() === 'clear' || priority === '' ? 'None' : priority;
  
  return (
    <Badge
      variant={variant}
      className={cn("capitalize", className)}
      style={color ? { backgroundColor: color } : undefined}
      {...props}
    >
      {displayText}
    </Badge>
  );
}

export { Badge, StatusBadge, PriorityBadge, badgeVariants };