import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] text-white hover:from-[var(--color-primary-600)] hover:to-[var(--color-primary-700)] hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-[var(--color-primary-500)]",
        secondary: "bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary-300)] focus-visible:ring-[var(--color-primary-500)]",
        outline: "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary-300)] focus-visible:ring-[var(--color-primary-500)]",
        ghost: "hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-primary-500)]",
        success: "bg-[var(--color-success-500)] text-white hover:bg-[var(--color-success-600)] hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-[var(--color-success-500)]",
        warning: "bg-[var(--color-warning-500)] text-white hover:bg-[var(--color-warning-600)] hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-[var(--color-warning-500)]",
        error: "bg-[var(--color-error-500)] text-white hover:bg-[var(--color-error-600)] hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-[var(--color-error-500)]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4 py-2",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };