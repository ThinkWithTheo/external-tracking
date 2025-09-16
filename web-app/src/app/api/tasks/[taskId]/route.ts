import { NextRequest, NextResponse } from 'next/server';
import { clickupAPI } from '@/lib/clickup-api';
import { ClickUpCustomField, TaskUpdateData } from '@/types/clickup';
import { logTaskChange } from '@/lib/blob-logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    
    // Get custom fields to handle developer field mapping
    const customFields = await clickupAPI.getCustomFields();
    const developerField = customFields.find(field =>
      field.name.toLowerCase().includes('developer')
    );

    // Prepare update data
    const updateData: TaskUpdateData = {};
    
    // Only include fields that were actually provided in the request
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.due_date !== undefined) updateData.due_date = body.due_date;
    if (body.time_estimate !== undefined) updateData.time_estimate = body.time_estimate;
    
    // Handle developer custom field mapping
    if (body.developer !== undefined && developerField) {
      if (developerField.type === 'drop_down') {
        // For dropdown fields, we need to find the option that matches the developer name
        const options = developerField.type_config?.options || [];
        const matchingOption = options.find((option) =>
          option.name.toLowerCase() === body.developer.toLowerCase()
        );
        
        if (matchingOption) {
          // Use the option ID/orderindex for dropdown fields
          updateData.custom_fields = [{
            id: developerField.id,
            value: matchingOption.orderindex || matchingOption.id
          }];
        } else if (body.developer === '') {
          // Clear the field if empty string provided
          updateData.custom_fields = [{
            id: developerField.id,
            value: null
          }];
        } else {
          console.warn(`No matching developer option found for: ${body.developer}`);
        }
      } else {
        // For non-dropdown fields, use the string value directly
        updateData.custom_fields = [{
          id: developerField.id,
          value: body.developer || null
        }];
      }
    }

    // Log the change before making the API call
    await logTaskChange(taskId, body, 'UPDATE', body.comment);

    // Update the task using ClickUp API
    const updatedTask = await clickupAPI.updateTask(taskId, updateData);

    // Add comment if provided
    if (body.comment && body.comment.trim()) {
      try {
        // Add comment to task (this would need a separate API call)
        // For now, we'll just log it
        console.log(`Comment for task ${taskId}: ${body.comment}`);
      } catch (error) {
        console.error('Error adding comment:', error);
        // Don't fail the whole update if comment fails
      }
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: 'Task updated successfully'
    });

  } catch (error: unknown) {
    const apiError = error as { message?: string; response?: { status?: number; data?: unknown } };
    console.error('Error in update task API:', error);
    
    // Better error handling for different scenarios
    let errorMessage = 'Failed to update task';
    let statusCode = 500;
    
    if (apiError.message?.includes('timeout')) {
      errorMessage = 'Request timed out. ClickUp may be experiencing delays. Please try again.';
      statusCode = 408;
    } else if (apiError.message?.includes('rate limit')) {
      errorMessage = 'Too many requests. Please wait a moment and try again.';
      statusCode = 429;
    } else if (apiError.message?.includes('not found')) {
      errorMessage = 'Task not found. It may have been deleted.';
      statusCode = 404;
    } else if (apiError.message?.includes('service is temporarily unavailable')) {
      errorMessage = 'ClickUp service is temporarily unavailable. Please try again later.';
      statusCode = 503;
    } else if (apiError.message) {
      errorMessage = apiError.message;
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: apiError.response?.data || null
      },
      { status: apiError.response?.status || statusCode }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    
    // Fetch all tasks to find the specific one
    // In a production app, you'd have a direct API call to get a single task
    const allTasks = await clickupAPI.getTasks(true, false);
    
    // Find the task by ID (could be a parent or subtask)
    let targetTask = allTasks.find(task => task.id === taskId);
    
    // If not found in parent tasks, search in subtasks
    if (!targetTask) {
      for (const parentTask of allTasks) {
        if (parentTask.subtasks) {
          targetTask = parentTask.subtasks.find(subtask => subtask.id === taskId);
          if (targetTask) break;
        }
      }
    }
    
    if (!targetTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      task: targetTask,
      message: 'Task fetched successfully'
    });
    
  } catch (error: unknown) {
    const apiError = error as { message?: string };
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: apiError.message || 'Failed to fetch task' },
      { status: 500 }
    );
  }
}