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

    // Step 2: Determine parent task based on admin status
    let parentTask: ClickUpTask;
    
    if (body.isAdmin && body.parentTask) {
      // Admin specified a parent task
      const allTasks = await clickupAPI.getTasks(true, false);
      const selectedParent = allTasks.find(task => task.id === body.parentTask);
      if (!selectedParent) {
        return NextResponse.json(
          { error: 'Selected parent task not found' },
          { status: 404 }
        );
      }
      parentTask = selectedParent;
    } else if (!body.isAdmin) {
      // Non-admin user, always use "New" parent task
      parentTask = await findOrCreateNewTask(customFields, developerField);
    } else {
      // Admin user but no parent selected - let them create without parent
      // This allows admin full flexibility
      parentTask = null as unknown as ClickUpTask;
    }

    // Step 3: Handle developer custom field mapping for the new task
    const taskData: TaskCreateData = { ...body };
    
    // Remove our custom fields from the task data
    const taskDataAny = taskData as unknown as Record<string, unknown>;
    delete taskDataAny.isAdmin;
    delete taskDataAny.parentTask;
    
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

    // Step 4: Set parent task ID if we have one
    if (parentTask) {
      taskData.parent = parentTask.id;
    }

    // Create the task using ClickUp API
    const newTask = await clickupAPI.createTask(taskData);

    // Build log data without undefined values
    const logData: Record<string, unknown> = {
      name: body.name,
      status: body.status,
    };
    
    // Only add fields if they have values
    if (body.description) logData.description = body.description;
    if (body.priority) logData.priority = body.priority;
    if (body.dueDate) logData.due_date = new Date(body.dueDate).getTime();
    if (body.timeEstimate) logData.time_estimate = parseInt(body.timeEstimate) * 60 * 60 * 1000;
    if (body.developer) logData.developer = body.developer;
    
    // Add created_by field to track who created the task
    logData.created_by = body.isAdmin ? 'Admin User' : 'Standard User';

    // Log the new task creation
    await logTaskChange(
      newTask.id,
      logData,
      'CREATE',
      body.comment
    );

    return NextResponse.json({
      success: true,
      task: newTask,
      parentTask: parentTask,
      message: parentTask ? `Task created successfully under ${parentTask.name}` : 'Task created successfully'
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

async function findOrCreateNewTask(customFields?: ClickUpCustomField[], developerField?: ClickUpCustomField): Promise<ClickUpTask> {
  try {
    // Get all tasks to find existing "New" task
    const allTasks = await clickupAPI.getTasks(true, false);
    
    // Look for existing "New" parent task (not a subtask)
    const existingNewTask = allTasks.find(task =>
      task.name.toLowerCase() === 'new' && !task.parent
    );

    if (existingNewTask) {
      console.log('Found existing New task:', existingNewTask.id);
      return existingNewTask;
    }

    // Create new "New" parent task assigned to "Young"
    console.log('Creating new New parent task...');
    
    // Use passed custom fields or fetch them if not provided
    let fields = customFields;
    let devField = developerField;
    
    if (!fields) {
      fields = await clickupAPI.getCustomFields();
      devField = fields.find(field =>
        field.name.toLowerCase().includes('developer')
      );
    }

    const newTaskData: TaskCreateData = {
      name: 'New',
      description: 'Parent task for all new items',
      status: 'OPEN'
    };

    // Set developer to "Young" if developer field exists
    if (devField && devField.type === 'drop_down') {
      const options = devField.type_config?.options || [];
      const youngOption = options.find((option) =>
        option.name.toLowerCase().includes('young')
      );
      
      if (youngOption) {
        newTaskData.custom_fields = [{
          id: devField.id,
          value: youngOption.orderindex || youngOption.id
        }];
      }
    } else if (devField) {
      newTaskData.custom_fields = [{
        id: devField.id,
        value: 'Young'
      }];
    }

    const newTask = await clickupAPI.createTask(newTaskData);
    console.log('Created new New task:', newTask.id);
    
    return newTask;

  } catch (error: unknown) {
    const apiError = error as { message?: string; response?: { status?: number } };
    console.error('Error finding/creating New task:', error);
    
    // Better error handling for timeout scenarios
    if (apiError.message?.includes('timeout')) {
      throw new Error('ClickUp API timeout while creating New parent task. Please try again in a moment.');
    } else if (apiError.response?.status === 429) {
      throw new Error('ClickUp API rate limit exceeded. Please wait a moment and try again.');
    } else if (apiError.response?.status && apiError.response.status >= 500) {
      throw new Error('ClickUp service is temporarily unavailable. Please try again later.');
    }
    
    throw error;
  }
}