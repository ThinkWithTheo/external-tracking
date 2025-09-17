import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

// Create and connect a Redis client, reusing the connection
async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  
  redisClient = createClient({ url: process.env.REDIS_URL });
  
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  
  await redisClient.connect();
  return redisClient;
}

// Use different keys for different environments
const getLogKey = () => {
  const env = process.env.VERCEL_ENV || 'development';
  
  switch (env) {
    case 'production':
      return 'logs:task-changes';
    case 'preview':
      return 'logs:task-changes-preview';
    default:
      return 'logs:task-changes-dev';
  }
};

const LOG_KEY = getLogKey();

function shouldUseRedisStorage(): boolean {
  return !!process.env.REDIS_URL;
}

export function getEnvironmentInfo(): {
  environment: string;
  storageType: 'redis' | 'local';
  filename: string;
} {
  return {
    environment: process.env.VERCEL_ENV || 'development',
    storageType: shouldUseRedisStorage() ? 'redis' : 'local',
    filename: LOG_KEY,
  };
}

interface LogEntry {
  taskId: string;
  action: 'CREATE' | 'UPDATE';
  timestamp: string;
  changes: Record<string, unknown>;
  comment?: string;
}

function formatLogEntry(entry: LogEntry): string {
  const changesList = Object.entries(entry.changes)
    .filter(([key]) => key !== 'custom_fields' && key !== 'parent')
    .map(([key, value]) => {
      if (typeof value === 'string') {
        const cleanValue = value.replace(/\n+$/, '');
        return `  - ${key}: "${cleanValue}"`;
      }
      return `  - ${key}: ${JSON.stringify(value)}`;
    })
    .join('\n');
  
  return `\n## ${entry.action} Task ${entry.taskId} - ${entry.timestamp}\n${changesList}${entry.comment ? `\nComment: ${entry.comment}` : ''}\n`;
}

async function logToLocalFile(entry: LogEntry): Promise<void> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'task-changes.md');
    await fs.mkdir(logDir, { recursive: true });
    const logContent = formatLogEntry(entry);
    await fs.appendFile(logFile, logContent, 'utf8');
    console.log(`Successfully logged to local file: ${entry.action} ${entry.taskId}`);
  } catch (error) {
    console.error('Error logging to local file:', error);
  }
}

export async function logTaskChange(
  taskId: string,
  changes: Record<string, unknown>,
  action: 'CREATE' | 'UPDATE' = 'UPDATE',
  comment?: string
): Promise<void> {
  const entry: LogEntry = { taskId, action, timestamp: new Date().toISOString(), changes, comment };
  
  if (shouldUseRedisStorage()) {
    try {
      const client = await getRedisClient();
      const logContent = formatLogEntry(entry);
      await client.append(LOG_KEY, logContent);
      console.log(`Successfully logged to Redis: ${entry.action} ${entry.taskId}`);
    } catch (error) {
      console.error('Redis failed, attempting local file fallback:', error);
      await logToLocalFile(entry);
      throw error;
    }
  } else {
    await logToLocalFile(entry);
  }
}

export async function getLogsFromLocal(): Promise<string> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const logFile = path.join(process.cwd(), 'logs', 'task-changes.md');
    return await fs.readFile(logFile, 'utf8');
  } catch {
    return '';
  }
}

export async function getAllLogs(): Promise<string> {
  if (shouldUseRedisStorage()) {
    try {
      const client = await getRedisClient();
      const logs = await client.get(LOG_KEY);
      return logs || '';
    } catch (error) {
      console.error('Error reading from Redis:', error);
      return '';
    }
  }
  return await getLogsFromLocal();
}

export async function overwriteLogs(content: string): Promise<void> {
  if (shouldUseRedisStorage()) {
    const client = await getRedisClient();
    await client.set(LOG_KEY, content);
  } else {
    const fs = await import('fs/promises');
    const path = await import('path');
    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'task-changes.md');
    await fs.mkdir(logDir, { recursive: true });
    await fs.writeFile(logFile, content, 'utf8');
  }
}

export async function getLogMetadata(): Promise<{
  size?: number;
  source: 'redis' | 'local';
} | null> {
  if (shouldUseRedisStorage()) {
    try {
      const client = await getRedisClient();
      const size = await client.strLen(LOG_KEY);
      return { size, source: 'redis' };
    } catch (error) {
      console.error('Error getting Redis metadata:', error);
    }
  }
  
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const logFile = path.join(process.cwd(), 'logs', 'task-changes.md');
    const stats = await fs.stat(logFile);
    return { size: stats.size, source: 'local' };
  } catch {
    return null;
  }
}