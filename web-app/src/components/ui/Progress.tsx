import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const progressVariants = cva(
  "relative h-2 w-full overflow-hidden rounded-full bg-[var(--color-border-light)]",
  {
    variants: {
      size: {
        sm: "h-1",
        default: "h-2",
        lg: "h-3",
        xl: "h-4",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const progressBarVariants = cva(
  "h-full w-full flex-1 bg-[var(--color-primary-500)] transition-all duration-300 ease-in-out",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary-500)]",
        success: "bg-[var(--color-success-500)]",
        warning: "bg-[var(--color-warning-500)]",
        error: "bg-[var(--color-error-500)]",
        gradient: "bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-secondary-500)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value?: number;
  max?: number;
  variant?: VariantProps<typeof progressBarVariants>['variant'];
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value = 0, 
    max = 100, 
    size, 
    variant = "default",
    showLabel = false,
    label,
    animated = false,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    // Determine variant based on percentage if not explicitly set
    const getAutoVariant = (percentage: number) => {
      if (percentage >= 100) return 'success';
      if (percentage >= 75) return 'default';
      if (percentage >= 50) return 'warning';
      return 'error';
    };

    const finalVariant = variant === 'default' && percentage > 0 ? getAutoVariant(percentage) : variant;

    return (
      <div className="w-full space-y-1">
        {(showLabel || label) && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">
              {label || 'Progress'}
            </span>
            <span className="text-[var(--color-text-primary)] font-medium">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
        <div
          ref={ref}
          className={cn(progressVariants({ size, className }))}
          {...props}
        >
          <div
            className={cn(
              progressBarVariants({ variant: finalVariant }),
              animated && "animate-pulse",
              "rounded-full"
            )}
            style={{
              transform: `translateX(-${100 - percentage}%)`,
            }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = "Progress";

// Circular Progress Component
interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: VariantProps<typeof progressBarVariants>['variant'];
  showLabel?: boolean;
  label?: string;
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ 
    className,
    value = 0,
    max = 100,
    size = 40,
    strokeWidth = 4,
    variant = "default",
    showLabel = false,
    label,
    ...props
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const getColor = (variant: string | null) => {
      switch (variant) {
        case 'success': return 'var(--color-success-500)';
        case 'warning': return 'var(--color-warning-500)';
        case 'error': return 'var(--color-error-500)';
        default: return 'var(--color-primary-500)';
      }
    };

    return (
      <div
        ref={ref}
        className={cn("relative inline-flex items-center justify-center", className)}
        {...props}
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--color-border-light)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getColor(variant)}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-[var(--color-text-primary)]">
              {label || `${Math.round(percentage)}%`}
            </span>
          </div>
        )}
      </div>
    );
  }
);

CircularProgress.displayName = "CircularProgress";

// Multi-step Progress Component
interface MultiStepProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: string[];
  currentStep: number;
  variant?: VariantProps<typeof progressBarVariants>['variant'];
}

const MultiStepProgress = React.forwardRef<HTMLDivElement, MultiStepProgressProps>(
  ({ className, steps, currentStep, variant = "default", ...props }, ref) => {
    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center text-sm",
                index <= currentStep 
                  ? "text-[var(--color-primary-500)] font-medium" 
                  : "text-[var(--color-text-muted)]"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mr-2",
                  index < currentStep
                    ? "bg-[var(--color-success-500)] text-white"
                    : index === currentStep
                    ? "bg-[var(--color-primary-500)] text-white"
                    : "bg-[var(--color-border-light)] text-[var(--color-text-muted)]"
                )}
              >
                {index < currentStep ? '✓' : index + 1}
              </div>
              <span className="hidden sm:inline">{step}</span>
            </div>
          ))}
        </div>
        <Progress
          value={currentStep + 1}
          max={steps.length}
          variant={variant}
          size="sm"
        />
      </div>
    );
  }
);

MultiStepProgress.displayName = "MultiStepProgress";

export { Progress, CircularProgress, MultiStepProgress, progressVariants };