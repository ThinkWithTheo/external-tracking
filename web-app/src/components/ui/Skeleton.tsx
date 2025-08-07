import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const skeletonVariants = cva(
  "animate-shimmer rounded-md bg-gradient-to-r from-[var(--color-border-light)] via-[var(--color-surface-hover)] to-[var(--color-border-light)] bg-[length:200px_100%]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-[var(--color-border-light)] via-[var(--color-surface-hover)] to-[var(--color-border-light)]",
        card: "bg-gradient-to-r from-[var(--color-border-light)] via-[var(--color-surface-hover)] to-[var(--color-border-light)] rounded-lg",
        text: "bg-gradient-to-r from-[var(--color-border-light)] via-[var(--color-surface-hover)] to-[var(--color-border-light)] rounded",
        circle: "bg-gradient-to-r from-[var(--color-border-light)] via-[var(--color-surface-hover)] to-[var(--color-border-light)] rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant, className }))}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

// Skeleton Text Component
interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  className?: string;
}

const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ lines = 3, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            className={cn(
              "h-4",
              index === lines - 1 ? "w-3/4" : "w-full" // Last line is shorter
            )}
          />
        ))}
      </div>
    );
  }
);

SkeletonText.displayName = "SkeletonText";

// Skeleton Card Component
interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  showAvatar?: boolean;
  showImage?: boolean;
  lines?: number;
}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ showAvatar = false, showImage = false, lines = 3, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("p-4 border border-[var(--color-border)] rounded-lg space-y-4", className)}
        {...props}
      >
        {showImage && (
          <Skeleton variant="card" className="h-48 w-full" />
        )}
        
        <div className="space-y-3">
          {showAvatar && (
            <div className="flex items-center space-x-3">
              <Skeleton variant="circle" className="h-10 w-10" />
              <div className="space-y-2 flex-1">
                <Skeleton variant="text" className="h-4 w-1/4" />
                <Skeleton variant="text" className="h-3 w-1/3" />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Skeleton variant="text" className="h-5 w-3/4" />
            <SkeletonText lines={lines} />
          </div>
        </div>
      </div>
    );
  }
);

SkeletonCard.displayName = "SkeletonCard";

// Skeleton Table Component
interface SkeletonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

const SkeletonTable = React.forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ rows = 5, columns = 4, showHeader = true, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("w-full space-y-3", className)}
        {...props}
      >
        {showHeader && (
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton
                key={`header-${index}`}
                variant="text"
                className="h-4 flex-1"
              />
            ))}
          </div>
        )}
        
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={`cell-${rowIndex}-${colIndex}`}
                  variant="text"
                  className={cn(
                    "h-4",
                    colIndex === 0 ? "flex-2" : "flex-1" // First column wider
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

SkeletonTable.displayName = "SkeletonTable";

// Skeleton List Component
interface SkeletonListProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: number;
  showAvatar?: boolean;
  showIcon?: boolean;
}

const SkeletonList = React.forwardRef<HTMLDivElement, SkeletonListProps>(
  ({ items = 5, showAvatar = false, showIcon = false, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-3", className)}
        {...props}
      >
        {Array.from({ length: items }).map((_, index) => (
          <div key={index} className="flex items-center space-x-3">
            {showAvatar && (
              <Skeleton variant="circle" className="h-8 w-8" />
            )}
            {showIcon && !showAvatar && (
              <Skeleton variant="default" className="h-4 w-4 rounded" />
            )}
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="h-4 w-3/4" />
              <Skeleton variant="text" className="h-3 w-1/2" />
            </div>
            <Skeleton variant="text" className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }
);

SkeletonList.displayName = "SkeletonList";

// Task Skeleton Component (specific to our use case)
const TaskSkeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("p-4 border-b border-[var(--color-border)] space-y-3", className)}
        {...props}
      >
        <div className="flex items-center space-x-4">
          {/* Expand button */}
          <Skeleton variant="default" className="h-4 w-4 rounded" />
          
          {/* Priority indicator */}
          <Skeleton variant="circle" className="h-2 w-2" />
          
          {/* Task name */}
          <Skeleton variant="text" className="h-4 flex-1" />
          
          {/* Time estimate */}
          <Skeleton variant="text" className="h-4 w-16" />
          
          {/* Developer */}
          <Skeleton variant="text" className="h-4 w-24" />
          
          {/* Status */}
          <Skeleton variant="default" className="h-6 w-20 rounded-full" />
          
          {/* Due date */}
          <Skeleton variant="text" className="h-4 w-16" />
          
          {/* Priority */}
          <Skeleton variant="text" className="h-4 w-16" />
          
          {/* Comments */}
          <Skeleton variant="text" className="h-4 w-8" />
        </div>
      </div>
    );
  }
);

TaskSkeleton.displayName = "TaskSkeleton";

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonCard, 
  SkeletonTable, 
  SkeletonList,
  TaskSkeleton,
  skeletonVariants 
};