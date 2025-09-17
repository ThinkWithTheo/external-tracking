import { put, list, del, head } from '@vercel/blob';

// Use different files for different environments
const getLogFilename = () => {
  const env = process.env.VERCEL_ENV || 'development';
  
  switch (env) {
    case 'production':
      return 'task-changes.md';  // Production log file
    case 'preview':
      return 'task-changes-preview.md';  // Preview/staging log file
    default:
      return 'task-changes-dev.md';  // Development/test log file
  }
};

const LOG_FILENAME = getLogFilename();

/**
 * Check if we should use Vercel Blob (only in production/preview on Vercel)
 */
function shouldUseBlobStorage(): boolean {
  // Only use blob storage if:
  // 1. We're running on Vercel (VERCEL env var is set)
  // 2. We have the blob token
  return process.env.VERCEL === '1' && !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Get environment info for logging
 */
export function getEnvironmentInfo(): {
  environment: string;
  storageType: 'blob' | 'local';
  filename: string;
} {
  return {
    environment: process.env.VERCEL_ENV || 'development',
    storageType: shouldUseBlobStorage() ? 'blob' : 'local',
    filename: LOG_FILENAME,
  };
}

/**
 * Log entry interface
 */
interface LogEntry {
  taskId: string;
  action: 'CREATE' | 'UPDATE';
  timestamp: string;
  changes: Record<string, unknown>;
  comment?: string;
}

/**
 * Format a log entry to markdown
 */
function formatLogEntry(entry: LogEntry): string {
  const changesList = Object.entries(entry.changes)
    .filter(([key]) => key !== 'custom_fields' && key !== 'parent')
    .map(([key, value]) => {
      // Handle string values specially to preserve formatting
      if (typeof value === 'string') {
        // Remove trailing newlines and wrap in quotes
        const cleanValue = value.replace(/\n+$/, '');
        return `  - ${key}: "${cleanValue}"`;
      }
      // For non-strings, use JSON.stringify
      return `  - ${key}: ${JSON.stringify(value)}`;
    })
    .join('\n');
  
  return `\n## ${entry.action} Task ${entry.taskId} - ${entry.timestamp}\n${changesList}${entry.comment ? `\nComment: ${entry.comment}` : ''}\n`;
}

/**
 * Append to Vercel Blob log file
 */
async function appendToBlob(content: string): Promise<void> {
  try {
    // First, try to get existing content
    let existingContent = '';
    
    try {
      // List all blobs to find our log file
      const { blobs } = await list();
      const logBlob = blobs.find(blob => blob.pathname === LOG_FILENAME);
      
      if (logBlob) {
        // Fetch the existing content
        const response = await fetch(logBlob.url);
        existingContent = await response.text();
      }
    } catch {
      console.log('Log file does not exist yet, will create new one');
    }
    
    // Append new content
    const newContent = existingContent + content;
    
    // Upload the updated content - allow overwrite since we're updating
    const blob = await put(LOG_FILENAME, newContent, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,  // Allow overwriting the existing file
    });
    
    console.log(`Successfully logged to Vercel Blob: ${blob.url}`);
  } catch (error) {
    console.error('Error logging to Vercel Blob:', error);
    throw error; // Re-throw to handle in calling function
  }
}

/**
 * Log to local file (for development and fallback)
 */
async function logToLocalFile(entry: LogEntry): Promise<void> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Always use local logs directory for development
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'task-changes.md');
    
    // Try to create directory if needed (may fail in read-only environments like Vercel)
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (mkdirError) {
      // Directory creation might fail in production (Vercel), but that's expected
      console.warn('Could not create logs directory (expected in production):', mkdirError);
      // Don't proceed if we can't create the directory
      return;
    }
    
    // Format and append
    const logContent = formatLogEntry(entry);
    await fs.appendFile(logFile, logContent, 'utf8');
    
    console.log(`Successfully logged to local file: ${entry.action} ${entry.taskId}`);
  } catch (error) {
    console.error('Error logging to local file:', error);
  }
}

/**
 * Main logging function
 * - In production (Vercel): Logs to Blob Store
 * - In development (local): Logs to local file only
 */
export async function logTaskChange(
  taskId: string,
  changes: Record<string, unknown>,
  action: 'CREATE' | 'UPDATE' = 'UPDATE',
  comment?: string
): Promise<void> {
  const entry: LogEntry = {
    taskId,
    action,
    timestamp: new Date().toISOString(),
    changes,
    comment,
  };
  
  if (shouldUseBlobStorage()) {
    // Production: Use Vercel Blob
    try {
      const logContent = formatLogEntry(entry);
      await appendToBlob(logContent);
      console.log(`Successfully logged to Vercel Blob: ${entry.action} ${entry.taskId}`);
    } catch (error) {
      // If blob fails, try local as fallback (though it may also fail in production)
      console.error('Blob storage failed, attempting local file fallback:', error);
      await logToLocalFile(entry);
    }
  } else {
    // Development: Use local file only
    await logToLocalFile(entry);
  }
}

/**
 * Get logs from Vercel Blob
 */
export async function getLogsFromBlob(): Promise<string> {
  if (!shouldUseBlobStorage()) {
    return ''; // Don't read from blob in development
  }
  
  try {
    const { blobs } = await list();
    const logBlob = blobs.find(blob => blob.pathname === LOG_FILENAME);
    
    if (logBlob) {
      const response = await fetch(logBlob.url);
      return await response.text();
    }
    
    return '';
  } catch (error) {
    console.error('Error reading from Vercel Blob:', error);
    return '';
  }
}

/**
 * Get logs from local file
 */
export async function getLogsFromLocal(): Promise<string> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const logFile = path.join(process.cwd(), 'logs', 'task-changes.md');
    const content = await fs.readFile(logFile, 'utf8');
    return content;
  } catch {
    console.log('No local log file found');
    return '';
  }
}

/**
 * Get all logs (production uses Blob, development uses local)
 */
export async function getAllLogs(): Promise<string> {
  if (shouldUseBlobStorage()) {
    // Production: Try blob first, fall back to local
    const blobLogs = await getLogsFromBlob();
    if (blobLogs) {
      return blobLogs;
    }
  }
  
  // Development or fallback: Use local
  return await getLogsFromLocal();
}

/**
 * Clear logs (mainly for testing/admin purposes)
 * Only works in production with proper auth
 */
export async function clearLogs(): Promise<boolean> {
  if (!shouldUseBlobStorage()) {
    console.warn('Cannot clear blob logs from development environment');
    return false;
  }
  
  try {
    const { blobs } = await list();
    const logBlob = blobs.find(blob => blob.pathname === LOG_FILENAME);
    
    if (logBlob) {
      await del(logBlob.url);
      console.log('Successfully cleared blob logs');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error clearing blob logs:', error);
    return false;
  }
}

/**
 * Get log metadata (size, last modified, etc.)
 */
export async function getLogMetadata(): Promise<{
  size?: number;
  uploadedAt?: Date;
  url?: string;
  source: 'blob' | 'local';
} | null> {
  if (shouldUseBlobStorage()) {
    try {
      const { blobs } = await list();
      const logBlob = blobs.find(blob => blob.pathname === LOG_FILENAME);
      
      if (logBlob) {
        const metadata = await head(logBlob.url);
        return {
          size: metadata.size,
          uploadedAt: new Date(metadata.uploadedAt),
          url: logBlob.url,
          source: 'blob',
        };
      }
    } catch (error) {
      console.error('Error getting blob metadata:', error);
    }
  }
  
  // Try local file
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const logFile = path.join(process.cwd(), 'logs', 'task-changes.md');
    const stats = await fs.stat(logFile);
    
    return {
      size: stats.size,
      uploadedAt: stats.mtime,
      source: 'local',
    };
  } catch {
    return null;
  }
}