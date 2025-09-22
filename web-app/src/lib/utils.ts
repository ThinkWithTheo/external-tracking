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

// Log parsing utility
export function parseInProgressTimestamps(logContent: string): Map<string, string> {
  const inProgressTimestamps = new Map<string, string>();
  const processedTaskIds = new Set<string>();

  if (!logContent) {
    return inProgressTimestamps;
  }

  // Use a global regex to find all log entry headers and their positions
  const headerRegex = /## (CREATE|UPDATE|MANUAL UPDATE) Task ([a-zA-Z0-9]+) - ([\d\-T:Z\.]+)/g;
  const matches = [...logContent.matchAll(headerRegex)];

  // Iterate backwards through the found headers
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const [fullHeader, action, taskId, timestamp] = match;
    
    // Skip if we've already found the latest entry for this task
    if (processedTaskIds.has(taskId)) {
      continue;
    }

    // Get the content of this specific log entry
    const entryStartIndex = match.index! + fullHeader.length;
    const nextEntryStartIndex = i + 1 < matches.length ? matches[i + 1].index! : logContent.length;
    const entryContent = logContent.substring(entryStartIndex, nextEntryStartIndex);

    if (action === 'MANUAL UPDATE') {
      const manualTimestampMatch = entryContent.match(/- inProgressSince: "([\d\-T:Z\.]+)"/);
      if (manualTimestampMatch) {
        inProgressTimestamps.set(taskId, manualTimestampMatch[1]);
        processedTaskIds.add(taskId);
      }
    } else { // Handles both CREATE and UPDATE
      if (entryContent.includes('- status: "IN PROGRESS"')) {
        inProgressTimestamps.set(taskId, timestamp);
        processedTaskIds.add(taskId);
      }
    }
  }
  
  return inProgressTimestamps;
}

export function formatInProgressDuration(inProgressSince?: string): string | null {
  if (!inProgressSince) return null;

  try {
    const startDate = new Date(inProgressSince);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      if (diffDays === 1) {
        return "1 day";
      }
      return `${diffDays} days`;
    }
    if (diffHours > 0) {
      if (diffHours === 1) {
        return "1 hour";
      }
      return `${diffHours} hours`;
    }
    return "<1 hour";
  } catch {
    return null;
  }
}

export function getInProgressDurationInfo(inProgressSince?: string): { duration: string | null; color: string; days: number } | null {
  if (!inProgressSince) return null;

  try {
    const startDate = new Date(inProgressSince);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const duration = formatInProgressDuration(inProgressSince);
    
    let color = 'text-blue-600'; // Default blue
    if (diffDays > 5) {
      color = 'text-red-600'; // Red for >5 days
    } else if (diffDays > 3) {
      color = 'text-yellow-600'; // Yellow for >3 days
    }
    
    return { duration, color, days: diffDays };
  } catch {
    return null;
  }
}