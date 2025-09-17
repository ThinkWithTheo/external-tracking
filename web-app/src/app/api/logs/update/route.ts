import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import { getEnvironmentInfo } from '@/lib/blob-logger';

export async function PUT(request: NextRequest) {
  try {
    const { content } = await request.json();
    
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Invalid content: must be a string' },
        { status: 400 }
      );
    }

    // Get the appropriate filename based on environment
    const { filename, storageType } = getEnvironmentInfo();
    
    // Check if we're using blob storage
    if (storageType === 'blob' && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        // Delete old file if it exists (to ensure clean update)
        const { blobs } = await list();
        const existingBlob = blobs.find(blob => blob.pathname === filename);
        
        // Upload the new content with overwrite
        const blob = await put(filename, content, {
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: true,
        });
        
        return NextResponse.json({
          success: true,
          message: 'Logs updated successfully',
          url: blob.url,
          size: content.length,
          filename,
        });
      } catch (error) {
        console.error('Error updating blob:', error);
        return NextResponse.json(
          { 
            error: 'Failed to update logs in blob storage',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    } else {
      // Local file update (for development)
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const logDir = path.join(process.cwd(), 'logs');
        const logFile = path.join(logDir, 'task-changes.md');
        
        // Ensure directory exists
        await fs.mkdir(logDir, { recursive: true });
        
        // Write the content
        await fs.writeFile(logFile, content, 'utf8');
        
        return NextResponse.json({
          success: true,
          message: 'Logs updated successfully (local)',
          size: content.length,
          filename: 'task-changes.md',
        });
      } catch (error) {
        console.error('Error updating local file:', error);
        return NextResponse.json(
          { 
            error: 'Failed to update local log file',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }
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
      filename,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check update availability' },
      { status: 500 }
    );
  }
}