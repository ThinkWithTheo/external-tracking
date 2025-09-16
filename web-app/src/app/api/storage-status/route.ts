import { NextResponse } from 'next/server';
import { getEnvironmentInfo, getLogMetadata, logTaskChange } from '@/lib/blob-logger';

export async function GET() {
  try {
    // Get environment and storage info
    const envInfo = getEnvironmentInfo();
    const metadata = await getLogMetadata();
    
    // Build status response
    const status = {
      environment: {
        VERCEL: process.env.VERCEL || 'not set',
        VERCEL_ENV: process.env.VERCEL_ENV || 'not set',
        NODE_ENV: process.env.NODE_ENV || 'not set',
        BLOB_TOKEN_EXISTS: !!process.env.BLOB_READ_WRITE_TOKEN,
      },
      storage: {
        type: envInfo.storageType,
        filename: envInfo.filename,
        environment: envInfo.environment,
      },
      logFile: metadata ? {
        exists: true,
        size: metadata.size,
        lastModified: metadata.uploadedAt,
        source: metadata.source,
        url: metadata.url,
      } : {
        exists: false,
        message: 'No log file found'
      },
      explanation: {
        production: 'Uses blob file: task-changes.md',
        preview: 'Uses blob file: task-changes-preview.md',
        development: 'Uses local file: logs/task-changes.md',
        current: `Currently using ${envInfo.storageType} storage with file: ${envInfo.filename}`
      }
    };
    
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Error getting storage status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get storage status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Test endpoint to create a test log entry
export async function POST() {
  try {
    const timestamp = new Date().toISOString();
    const testTaskId = `TEST-${Date.now()}`;
    
    // Create a test log entry
    await logTaskChange(
      testTaskId,
      {
        name: 'Test Task for Storage Verification',
        description: 'This is a test entry to verify blob storage is working',
        status: 'TEST',
        timestamp,
      },
      'CREATE',
      `Test log created at ${timestamp}`
    );
    
    // Get updated metadata
    const envInfo = getEnvironmentInfo();
    const metadata = await getLogMetadata();
    
    return NextResponse.json({
      success: true,
      message: 'Test log entry created',
      taskId: testTaskId,
      storage: {
        type: envInfo.storageType,
        filename: envInfo.filename,
        environment: envInfo.environment,
      },
      logFile: metadata ? {
        size: metadata.size,
        source: metadata.source,
        url: metadata.url,
      } : null,
    });
  } catch (error) {
    console.error('Error creating test log:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create test log',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}