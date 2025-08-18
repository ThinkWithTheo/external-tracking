import { NextRequest, NextResponse } from 'next/server';
import { clickupAPI } from '@/lib/clickup-api';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeComments = searchParams.get('includeComments') === 'true';

    // Test API connection first
    const isConnected = await clickupAPI.testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Failed to connect to ClickUp API. Please check your API token.' },
        { status: 500 }
      );
    }

    console.log(`Processing tasks with comments: ${includeComments}`);

    // Fetch raw tasks from ClickUp
    const rawTasks = await clickupAPI.getTasks(true, false); // Include subtasks, exclude closed

    // Process tasks for UI (comments disabled by default to reduce API calls)
    const processedTasks = await clickupAPI.processTasksForUI(rawTasks, includeComments);

    return NextResponse.json({
      success: true,
      tasks: processedTasks,
      totalTasks: processedTasks.length,
      totalSubtasks: processedTasks.reduce((acc, task) => acc + task.subtasks.length, 0),
    });

  } catch (error) {
    console.error('Error in /api/tasks:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch tasks from ClickUp',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}