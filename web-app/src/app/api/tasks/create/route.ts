import { NextRequest, NextResponse } from 'next/server';
import { clickupAPI } from '@/lib/clickup-api';
import { ClickUpCustomField, ClickUpTask, TaskCreateData } from '@/types/clickup';
import { logTaskChange } from '@/lib/blob-logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Task name is required' },
        { status: 400 }
      );
    }

    // Step 1: Get custom fields once (optimization to reduce API calls)
    const customFields = await clickupAPI.getCustomFields();
    const developerField = customFields.find(field =>
      field.name.toLowerCase().includes('developer')
    );

    // Step 2: Find or create "Review" parent task (pass custom fields to avoid duplicate call)
    const reviewTask = await findOrCreateReviewTask(customFields, developerField);

    // Step 3: Handle developer custom field mapping for the new task
    const taskData: TaskCreateData = { ...body };
    
    if (body.developer && developerField) {
      if (developerField.type === 'drop_down') {
        // For dropdown fields, we need to find the option that matches the developer name
        const options = developerField.type_config?.options || [];
        const matchingOption = options.find((option) =>
          option.name.toLowerCase() === body.developer.toLowerCase()
        );
        
        if (matchingOption) {
          // Use the option ID/orderindex for dropdown fields
          taskData.custom_fields = [{
            id: developerField.id,
            value: matchingOption.orderindex || matchingOption.id
          }];
        } else {
          // If no matching option found, don't set the custom field
          console.warn(`No matching developer option found for: ${body.developer}`);
        }
      } else {
        // For non-dropdown fields, use the string value directly
        taskData.custom_fields = [{
          id: developerField.id,
          value: body.developer
        }];
      }
      
      // Remove the developer field from the main task data
      delete taskData.developer;
    }

    // Step 4: Set parent task ID to make this a subtask of "Review"
    taskData.parent = reviewTask.id;

    // Create the task using ClickUp API
    const newTask = await clickupAPI.createTask(taskData);

    // Log the new task creation
    await logTaskChange(
      newTask.id,
      {
        name: body.name,
        description: body.description,
        status: body.status,
        priority: body.priority,
        due_date: body.dueDate ? new Date(body.dueDate).getTime() : undefined,
        time_estimate: body.timeEstimate ? parseInt(body.timeEstimate) * 60 * 60 * 1000 : undefined,
        developer: body.developer,
      },
      'CREATE',
      body.comment
    );

    return NextResponse.json({
      success: true,
      task: newTask,
      reviewTask: reviewTask,
      message: 'Subtask created successfully under Review'
    });

  } catch (error: unknown) {
    const apiError = error as { message?: string; response?: { status?: number; data?: unknown } };
    console.error('Error in create task API:', error);
    
    // Better error handling for different scenarios
    let errorMessage = 'Failed to create task';
    let statusCode = 500;
    
    if (apiError.message?.includes('timeout')) {
      errorMessage = 'Request timed out. ClickUp may be experiencing delays. Please try again.';
      statusCode = 408;
    } else if (apiError.message?.includes('rate limit')) {
      errorMessage = 'Too many requests. Please wait a moment and try again.';
      statusCode = 429;
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

async function findOrCreateReviewTask(customFields?: ClickUpCustomField[], developerField?: ClickUpCustomField): Promise<ClickUpTask> {
  try {
    // Get all tasks to find existing "Review" task
    const allTasks = await clickupAPI.getTasks(true, false);
    
    // Look for existing "Review" parent task (not a subtask)
    const existingReviewTask = allTasks.find(task =>
      task.name.toLowerCase() === 'review' && !task.parent
    );

    if (existingReviewTask) {
      console.log('Found existing Review task:', existingReviewTask.id);
      return existingReviewTask;
    }

    // Create new "Review" parent task assigned to "Young"
    console.log('Creating new Review parent task...');
    
    // Use passed custom fields or fetch them if not provided
    let fields = customFields;
    let devField = developerField;
    
    if (!fields) {
      fields = await clickupAPI.getCustomFields();
      devField = fields.find(field =>
        field.name.toLowerCase().includes('developer')
      );
    }

    const reviewTaskData: TaskCreateData = {
      name: 'Review',
      description: 'Parent task for all review items',
      status: 'IN PROGRESS'
    };

    // Set developer to "Young" if developer field exists
    if (devField && devField.type === 'drop_down') {
      const options = devField.type_config?.options || [];
      const youngOption = options.find((option) =>
        option.name.toLowerCase().includes('young')
      );
      
      if (youngOption) {
        reviewTaskData.custom_fields = [{
          id: devField.id,
          value: youngOption.orderindex || youngOption.id
        }];
      }
    } else if (devField) {
      reviewTaskData.custom_fields = [{
        id: devField.id,
        value: 'Young'
      }];
    }

    const newReviewTask = await clickupAPI.createTask(reviewTaskData);
    console.log('Created new Review task:', newReviewTask.id);
    
    return newReviewTask;

  } catch (error: unknown) {
    const apiError = error as { message?: string; response?: { status?: number } };
    console.error('Error finding/creating Review task:', error);
    
    // Better error handling for timeout scenarios
    if (apiError.message?.includes('timeout')) {
      throw new Error('ClickUp API timeout while creating Review parent task. Please try again in a moment.');
    } else if (apiError.response?.status === 429) {
      throw new Error('ClickUp API rate limit exceeded. Please wait a moment and try again.');
    } else if (apiError.response?.status && apiError.response.status >= 500) {
      throw new Error('ClickUp service is temporarily unavailable. Please try again later.');
    }
    
    throw error;
  }
}