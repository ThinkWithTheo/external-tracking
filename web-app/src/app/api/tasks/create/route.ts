import { NextRequest, NextResponse } from 'next/server';
import { clickupAPI } from '@/lib/clickup-api';

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

    // Step 1: Find or create "Review" parent task
    const reviewTask = await findOrCreateReviewTask();

    // Step 2: Handle developer custom field mapping
    let taskData = { ...body };
    
    if (body.developer) {
      // Get custom fields to find the developer field ID
      const customFields = await clickupAPI.getCustomFields();
      const developerField = customFields.find(field =>
        field.name.toLowerCase().includes('developer')
      );
      
      if (developerField && developerField.type === 'drop_down') {
        // For dropdown fields, we need to find the option that matches the developer name
        const options = developerField.type_config?.options || [];
        const matchingOption = options.find((option: any) =>
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
      } else if (developerField) {
        // For non-dropdown fields, use the string value directly
        taskData.custom_fields = [{
          id: developerField.id,
          value: body.developer
        }];
      }
      
      // Remove the developer field from the main task data
      delete taskData.developer;
    }

    // Step 3: Set parent task ID to make this a subtask of "Review"
    taskData.parent = reviewTask.id;

    // Create the task using ClickUp API
    const newTask = await clickupAPI.createTask(taskData);

    return NextResponse.json({
      success: true,
      task: newTask,
      reviewTask: reviewTask,
      message: 'Subtask created successfully under Review'
    });

  } catch (error: any) {
    console.error('Error in create task API:', error);
    
    return NextResponse.json(
      {
        error: error.message || 'Failed to create task',
        details: error.response?.data || null
      },
      { status: error.response?.status || 500 }
    );
  }
}

async function findOrCreateReviewTask() {
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
    
    // Get custom fields and find developer field
    const customFields = await clickupAPI.getCustomFields();
    const developerField = customFields.find(field =>
      field.name.toLowerCase().includes('developer')
    );

    let reviewTaskData: any = {
      name: 'Review',
      description: 'Parent task for all review items',
      status: 'in progress'
    };

    // Set developer to "Young" if developer field exists
    if (developerField && developerField.type === 'drop_down') {
      const options = developerField.type_config?.options || [];
      const youngOption = options.find((option: any) =>
        option.name.toLowerCase().includes('young')
      );
      
      if (youngOption) {
        reviewTaskData.custom_fields = [{
          id: developerField.id,
          value: youngOption.orderindex || youngOption.id
        }];
      }
    } else if (developerField) {
      reviewTaskData.custom_fields = [{
        id: developerField.id,
        value: 'Young'
      }];
    }

    const newReviewTask = await clickupAPI.createTask(reviewTaskData);
    console.log('Created new Review task:', newReviewTask.id);
    
    return newReviewTask;

  } catch (error) {
    console.error('Error finding/creating Review task:', error);
    throw error;
  }
}