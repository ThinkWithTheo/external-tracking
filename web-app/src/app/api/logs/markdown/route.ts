import { getAllLogs } from '@/lib/blob-logger';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    let content = await getAllLogs();
    
    if (!content || content.trim() === '') {
      content = '# Task Changes Log\n\nNo changes recorded yet.\n';
    }
    
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'inline; filename="task-changes.md"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
  } catch (error) {
    console.error('Error in markdown log endpoint:', error);
    
    const errorContent = `# Task Changes Log\n\n## Error\n\nUnable to retrieve log file.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
    
    return new NextResponse(errorContent, {
      status: 500,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'inline; filename="task-changes.md"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}