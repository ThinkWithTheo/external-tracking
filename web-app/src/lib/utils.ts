import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Color utility functions
export const statusColors = {
  'to do': 'var(--color-status-todo)',
  'in progress': 'var(--color-status-progress)',
  'in review': 'var(--color-status-review)',
  'done': 'var(--color-status-done)',
  'complete': 'var(--color-status-done)',
  'closed': 'var(--color-status-done)',
} as const;

export const priorityColors = {
  urgent: 'var(--color-error-500)',
  high: 'var(--color-warning-500)',
  normal: 'var(--color-primary-500)',
  low: 'var(--color-text-muted)',
} as const;

// Format utilities
export function formatTimeEstimate(timeInMs?: number): string {
  if (!timeInMs) return '—';
  
  const hours = Math.floor(timeInMs / (1000 * 60 * 60));
  const minutes = Math.floor((timeInMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  }
  return `${minutes}m`;
}

export function formatDueDate(dueDateString?: string): string {
  if (!dueDateString) return '—';
  
  try {
    const dueDate = new Date(parseInt(dueDateString));
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)}d overdue`;
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays <= 7) {
      return `${diffDays}d`;
    } else {
      return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch {
    return '—';
  }
}

export function getPriorityColor(priority?: { name: string; color: string }): string {
  if (!priority) return 'transparent';
  
  const priorityName = priority.name.toLowerCase() as keyof typeof priorityColors;
  return priorityColors[priorityName] || priority.color;
}

export function getStatusColor(status: string): string {
  const statusKey = status.toLowerCase() as keyof typeof statusColors;
  return statusColors[statusKey] || 'var(--color-text-muted)';
}

// Animation utilities
export function staggerChildren(index: number, delay: number = 50): { animationDelay: string } {
  return {
    animationDelay: `${index * delay}ms`
  };
}