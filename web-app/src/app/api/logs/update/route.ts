import { NextRequest, NextResponse } from 'next/server';
import { overwriteLogs, getEnvironmentInfo } from '@/lib/blob-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(request: NextRequest) {
  try {
    const { content } = await request.json();
    
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Invalid content: must be a string' },
        { status: 400 }
      );
    }

    await overwriteLogs(content);
    
    return NextResponse.json({
      success: true,
      message: 'Logs updated successfully',
      size: content.length,
    });

  } catch (error) {
    console.error('Error in update logs API:', error);
    return NextResponse.json(
      {
        error: 'Failed to update logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if update is available
export async function GET() {
  try {
    const { filename, storageType, environment } = getEnvironmentInfo();
    
    return NextResponse.json({
      updateAvailable: true,
      storageType,
      environment,
      key: filename, // Keep 'filename' for compatibility, but it's a key now
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to check update availability' },
      { status: 500 }
    );
  }
}