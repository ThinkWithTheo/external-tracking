import { NextRequest, NextResponse } from 'next/server';
import { clickupAPI } from '@/lib/clickup-api';
import { TaskUpdateData } from '@/types/clickup';
import { logTaskChange } from '@/lib/blob-logger';
import { parseInProgressTimestamps } from '@/lib/utils';
import { getAllLogs } from '@/lib/blob-logger';

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
    if (body.parent !== undefined) updateData.parent = body.parent;
    
    // Handle developer custom field separately using the dedicated endpoint
    if (body.developer !== undefined && developerField) {
      console.log('Setting developer to:', body.developer);
      
      // Find the matching option for the developer
      const options = developerField.type_config?.options || [];
      const matchingOption = options.find((option) =>
        option.name.toLowerCase() === body.developer.toLowerCase()
      );
      
      if (matchingOption || body.developer === '') {
        try {
          // Use the dedicated custom field endpoint
          const fieldUpdateResponse = await fetch(
            `https://api.clickup.com/api/v2/task/${taskId}/field/${developerField.id}`,
            {
              method: 'POST',
              headers: {
                'Authorization': process.env.CLICKUP_API_TOKEN!,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                value: matchingOption ? matchingOption.id : null
              })
            }
          );
          
          if (!fieldUpdateResponse.ok) {
            console.error('Failed to update developer field:', await fieldUpdateResponse.text());
          } else {
            console.log('Developer field updated successfully');
          }
        } catch (error) {
          console.error('Error updating developer field:', error);
        }
      } else {
        console.warn(`No matching developer option found for: ${body.developer}`);
      }
      
      // Remove developer from the main update data since we handled it separately
      delete updateData.developer;
    }

    // Update the task using ClickUp API (for non-custom-field updates)
    let updatedTask;
    if (Object.keys(updateData).length > 0) {
      updatedTask = await clickupAPI.updateTask(taskId, updateData);
    } else {
      // If only updating custom fields, fetch the updated task
      const response = await fetch(
        `https://api.clickup.com/api/v2/task/${taskId}`,
        {
          headers: {
            'Authorization': process.env.CLICKUP_API_TOKEN!
          }
        }
      );
      updatedTask = await response.json();
    }

    // Log the change after a successful API call
    try {
      const logData = { ...body };
      
      // Handle manual override of inProgressSince
      if (body.inProgressSince) {
        await logTaskChange(
          taskId,
          { inProgressSince: body.inProgressSince },
          'MANUAL UPDATE',
          'Manually corrected by admin'
        );
        // Remove from main log data to avoid duplication
        delete logData.inProgressSince;
      }

      if (logData.time_estimate) {
        logData.time_estimate = `${logData.time_estimate / 3600000} hours`;
      }
      
      // If a comment is present (non-admin update), replace the description with the comment for logging purposes.
      if (body.comment) {
        logData.description = body.comment;
        delete logData.comment; // Clean up the temporary comment field
      }

      // Only log if there are other changes besides the manual override
      if (Object.keys(logData).length > 0) {
        await logTaskChange(taskId, logData, 'UPDATE');
      }
    } catch (logError) {
      console.error('CRITICAL: Task was updated but logging failed:', logError);
      // Return success but with a warning that logging failed
      return NextResponse.json({
        success: true,
        task: updatedTask,
        message: 'Task updated successfully',
        warning: 'Failed to write to the activity log.'
      });
    }

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
    
    // Fetch and parse logs to get inProgressSince timestamp
    let inProgressSince: string | undefined;
    try {
      const logContent = await getAllLogs();
      const inProgressTimestamps = parseInProgressTimestamps(logContent);
      inProgressSince = inProgressTimestamps.get(taskId);
    } catch (error) {
      console.error('Error fetching in progress timestamp:', error);
    }
    
    // Add the inProgressSince field to the task
    const taskWithInProgressSince = {
      ...targetTask,
      inProgressSince
    };
    
    return NextResponse.json({
      task: taskWithInProgressSince,
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