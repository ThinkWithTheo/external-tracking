import { NextResponse } from 'next/server';
import { getAllLogs } from '@/lib/blob-logger';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Get logs from blob storage (in production) or local file (in development)
    let content = await getAllLogs();
    
    // If content is empty, provide default content
    if (!content || content.trim() === '') {
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