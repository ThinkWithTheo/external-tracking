import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Use /tmp directory on Vercel (serverless environment)
    const isVercel = process.env.VERCEL === '1';
    const logDir = isVercel ? '/tmp' : path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, 'task-changes.md');
    
    // Check if we're on Vercel and need to initialize the file
    if (isVercel) {
      try {
        await fs.access(logFile);
      } catch {
        // File doesn't exist on Vercel, create it with initial content
        const initialContent = `# Task Changes Log\n\nLog started: ${new Date().toISOString()}\n\n---\n\n`;
        await fs.mkdir(logDir, { recursive: true });
        await fs.writeFile(logFile, initialContent, 'utf8');
      }
    }
    
    let content = '';
    try {
      content = await fs.readFile(logFile, 'utf8');
      
      // If content is empty, provide default content
      if (!content || content.trim() === '') {
        content = '# Task Changes Log\n\nNo changes recorded yet.\n';
      }
    } catch {
      // File doesn't exist, return default content
      content = '# Task Changes Log\n\nNo changes recorded yet.\n';
    }
    
    // Return raw markdown content
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'inline; filename="task-changes.md"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
    
  } catch (error) {
    console.error('Error in markdown log endpoint:', error);
    
    // Return a valid markdown response even on error
    const errorContent = `# Task Changes Log\n\n## Error\n\nUnable to retrieve log file at this time.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
    
    return new NextResponse(errorContent, {
      status: 200, // Return 200 with error content instead of 500
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'inline; filename="task-changes.md"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
}