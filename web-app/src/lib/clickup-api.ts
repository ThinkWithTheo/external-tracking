import axios, { AxiosInstance } from 'axios';
import {
  ClickUpTask,
  ClickUpListResponse,
  ClickUpCommentsResponse,
  ProcessedTask,
  ClickUpSpace,
  ClickUpList,
  ClickUpFolder,
  ClickUpTeam,
  ClickUpStatus,
  ClickUpCustomField,
  TaskCreateData,
  TaskUpdateData,
  ApiError
} from '@/types/clickup';
import { parseInProgressTimestamps } from '@/lib/utils';
import { getAllLogs } from '@/lib/blob-logger';

class ClickUpAPI {
  private client: AxiosInstance;
  private apiToken: string;
  private listId: string;
  private teamId: string;
  private requestQueue: Promise<unknown>[] = [];
  private lastRequestTime: number = 0;
  private readonly RATE_LIMIT_DELAY = 100; // 100ms between requests
  private customFieldsCache: Map<string, ClickUpCustomField[]> = new Map(); // Cache for custom field definitions

  constructor() {
    this.apiToken = process.env.CLICKUP_API_TOKEN || '';
    this.listId = process.env.CLICKUP_LIST_ID || '';
    this.teamId = process.env.CLICKUP_TEAM_ID || '';

    if (!this.apiToken) {
      throw new Error('CLICKUP_API_TOKEN is required');
    }

    this.client = axios.create({
      baseURL: 'https://api.clickup.com/api/v2',
      headers: {
        'Authorization': this.apiToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // Increased to 30 seconds for task creation operations
    });
  }

  /**
   * Rate limiting helper to prevent API overload
   */
  private async rateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    return await requestFn();
  }

  /**
   * Retry logic for handling rate limits and temporary failures
   */
  private async retryRequest<T>(requestFn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.rateLimitedRequest(requestFn);
      } catch (error: unknown) {
        const apiError = error as ApiError;
        if (apiError.response?.status === 429 && attempt < maxRetries) {
          // Rate limited, wait longer before retry
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
          console.log(`Rate limited, retrying in ${backoffDelay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Fetch tasks from the specified ClickUp list with pagination support
   * @param includeSubtasks - Whether to include subtasks in the response
   * @param includeClosed - Whether to include closed tasks
   * @returns Promise<ClickUpTask[]>
   */
  async getTasks(includeSubtasks: boolean = true, includeClosed: boolean = false): Promise<ClickUpTask[]> {
    try {
      let allTasks: ClickUpTask[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const params: Record<string, unknown> = {
          archived: false,
          subtasks: includeSubtasks,
          include_closed: includeClosed,
          page: page,
        };

        console.log(`Fetching tasks from list: ${this.listId} - Page ${page}`);
        
        const response = await this.retryRequest(() =>
          this.client.get<ClickUpListResponse>(`/list/${this.listId}/task`, { params })
        );

        const tasks = response.data.tasks;
        console.log(`Fetched ${tasks.length} tasks from page ${page}`);
        
        if (tasks.length === 0) {
          hasMore = false;
        } else {
          allTasks = allTasks.concat(tasks);
          page++;
          
          // Check if this is the last page
          if (response.data.last_page === true || tasks.length < 100) {
            hasMore = false;
          }
        }
      }

      console.log(`Successfully fetched ${allTasks.length} total tasks across ${page} pages`);
      return allTasks;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Error fetching tasks from ClickUp:', {
        message: apiError.message,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        listId: this.listId,
      });
      
      if (apiError.response?.status === 400) {
        throw new Error(`Invalid request to ClickUp API. Please check your List ID: ${this.listId}`);
      } else if (apiError.response?.status === 401) {
        throw new Error('Invalid ClickUp API token. Please check your credentials.');
      } else if (apiError.response?.status === 403) {
        throw new Error('Access denied. Please check your ClickUp permissions for this list.');
      } else {
        throw new Error(`Failed to fetch tasks from ClickUp: ${apiError.message}`);
      }
    }
  }

  /**
   * Fetch comments for a specific task
   * @param taskId - The ClickUp task ID
   * @returns Promise<ClickUpCommentsResponse>
   */
  async getTaskComments(taskId: string): Promise<ClickUpCommentsResponse> {
    try {
      const response = await this.retryRequest(() =>
        this.client.get<ClickUpCommentsResponse>(`/task/${taskId}/comment`)
      );
      return response.data;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      // If still failing after retries, log and return empty comments
      if (apiError.response?.status === 429) {
        console.warn(`Rate limit exceeded for task ${taskId} comments, skipping`);
      } else {
        console.error(`Error fetching comments for task ${taskId}:`, apiError.message);
      }
      return { comments: [] };
    }
  }

  /**
   * Fetch custom field definitions for a list
   * @returns Promise<any[]>
   */
  async getCustomFields(): Promise<ClickUpCustomField[]> {
    try {
      const cacheKey = `custom_fields_${this.listId}`;
      
      // Check cache first
      if (this.customFieldsCache.has(cacheKey)) {
        return this.customFieldsCache.get(cacheKey) || [];
      }

      const response = await this.retryRequest(() =>
        this.client.get(`/list/${this.listId}/field`)
      );

      const customFields = response.data.fields || [];
      
      // Cache the result
      this.customFieldsCache.set(cacheKey, customFields);
      
      // Custom field definitions fetched successfully

      return customFields;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Error fetching custom fields:', apiError.message);
      return [];
    }
  }

  /**
   * Get dropdown option name and color by field ID and option ID
   * @param fieldId - The custom field ID
   * @param optionId - The selected option ID
   * @param customFields - Array of custom field definitions
   * @returns { name: string; color: string } | undefined
   */
  private getDropdownOption(fieldId: string, optionId: number, customFields: ClickUpCustomField[]): { name: string; color: string } | undefined {
    const field = customFields.find(f => f.id === fieldId);
    if (!field || field.type !== 'drop_down') {
      return undefined;
    }

    const option = field.type_config?.options?.find((opt) =>
      opt.id === optionId || opt.orderindex === optionId
    );
    
    if (!option) {
      return undefined;
    }

    return {
      name: option.name,
      color: option.color || '#64748b' // Default color if none provided
    };
  }

  /**
   * Get dropdown option name by field ID and option ID (legacy method for backwards compatibility)
   * @param fieldId - The custom field ID
   * @param optionId - The selected option ID
   * @param customFields - Array of custom field definitions
   * @returns string | undefined
   */
  private getDropdownOptionName(fieldId: string, optionId: number, customFields: ClickUpCustomField[]): string | undefined {
    const option = this.getDropdownOption(fieldId, optionId, customFields);
    return option?.name;
  }

  /**
   * Process raw ClickUp tasks into our UI-friendly format
   * @param tasks - Raw ClickUp tasks
   * @returns Promise<ProcessedTask[]>
   */
  async processTasksForUI(tasks: ClickUpTask[], includeComments: boolean = false): Promise<ProcessedTask[]> {
    // Fetch custom field definitions once for all tasks
    const customFields = await this.getCustomFields();
    
    // Fetch and parse logs for "In Progress" timestamps by calling the function directly
    let inProgressTimestamps = new Map<string, string>();
    try {
      const logContent = await getAllLogs();
      if (logContent) {
        inProgressTimestamps = parseInProgressTimestamps(logContent);
      } else {
        console.warn('Log content is empty, "In Progress" durations will not be available.');
      }
    } catch (error) {
      console.error('Error reading or parsing task logs:', error);
    }

    // Filter out closed and completed tasks
    const initialCount = tasks.length;
    const openTasks = tasks.filter(task => {
      const statusLower = task.status.status.toLowerCase();
      const statusType = task.status.type?.toLowerCase();
      
      // Exclude tasks that are closed, completed, done, or archived
      return statusType !== 'closed' &&
             statusType !== 'done' &&
             statusType !== 'complete' &&
             statusLower !== 'closed' &&
             statusLower !== 'complete' &&
             statusLower !== 'completed' &&
             statusLower !== 'done' &&
             !task.archived;
    });
    
    const filteredCount = initialCount - openTasks.length;
    if (filteredCount > 0) {
      console.log(`Filtered out ${filteredCount} completed/closed tasks from ${initialCount} total tasks`);
    }

    // Separate main tasks and subtasks
    const mainTasks = openTasks.filter(task => !task.parent);
    const subtasks = openTasks.filter(task => task.parent);

    // Process main tasks
    const processedTasks: ProcessedTask[] = [];

    // Process tasks sequentially to avoid overwhelming the API
    for (const task of mainTasks) {
      try {
        // Find subtasks for this main task
        const taskSubtasks = subtasks.filter(subtask => subtask.parent === task.id);
        
        // Special handling for "Review" parent task - hide if no subtasks
        if (task.name.toLowerCase() === 'review' && taskSubtasks.length === 0) {
          console.log('Hiding Review parent task - no subtasks found');
          continue; // Skip this task, don't add it to processedTasks
        }

        const processedTask = await this.processTask(task, false, undefined, includeComments, customFields, inProgressTimestamps);
        processedTask.subtasks = [];

        // Process subtasks sequentially as well
        for (const subtask of taskSubtasks) {
          try {
            const processedSubtask = await this.processTask(subtask, true, task.id, includeComments, customFields, inProgressTimestamps);
            processedTask.subtasks.push(processedSubtask);
          } catch (error) {
            console.warn(`Failed to process subtask ${subtask.id}:`, error);
            // Continue processing other subtasks
          }
        }

        processedTasks.push(processedTask);
      } catch (error) {
        console.warn(`Failed to process main task ${task.id}:`, error);
        // Continue processing other tasks
      }
    }

    return processedTasks;
  }

  /**
   * Process a single task into UI format
   * @param task - Raw ClickUp task
   * @param isSubtask - Whether this is a subtask
   * @param parentId - Parent task ID if this is a subtask
   * @param includeComments - Whether to fetch comments
   * @param customFields - Custom field definitions for dropdown mapping
   * @returns Promise<ProcessedTask>
   */
  private async processTask(task: ClickUpTask, isSubtask: boolean, parentId?: string, includeComments: boolean = false, customFields: ClickUpCustomField[] = [], inProgressTimestamps: Map<string, string> = new Map()): Promise<ProcessedTask> {
    // Get comments for this task only if requested
    let commentsResponse: ClickUpCommentsResponse = { comments: [] };
    if (includeComments) {
      commentsResponse = await this.getTaskComments(task.id);
    }

    // Find developer from custom fields
    const developerField = task.custom_fields.find(field => {
      const fieldName = field.name.toLowerCase();
      // Look for exact "developer" match first, then broader matches
      return fieldName === 'developer' ||
             fieldName === 'developers' ||
             fieldName.includes('developer') ||
             fieldName.includes('assignee');
    });

    let developer: string | undefined;
    let developerColor: string | undefined;
    
    // Handle developer field value - it can be undefined, string, object, array, or number (dropdown ID)
    if (developerField && developerField.value !== undefined && developerField.value !== null) {
      if (typeof developerField.value === 'string') {
        developer = developerField.value;
      } else if (typeof developerField.value === 'number') {
        // Handle dropdown field - map ID to name and color
        const dropdownOption = this.getDropdownOption(developerField.id, developerField.value, customFields);
        if (dropdownOption) {
          developer = dropdownOption.name;
          developerColor = dropdownOption.color;
          // Successfully mapped dropdown option
        } else {
          console.warn(`Could not map dropdown ID ${developerField.value} for Developer field in task "${task.name}"`);
        }
      } else if (Array.isArray(developerField.value)) {
        // Handle multiple developers - take the first one
        const firstDev = developerField.value[0];
        if (typeof firstDev === 'string') {
          developer = firstDev;
        } else if (typeof firstDev === 'number') {
          // Handle dropdown array
          const dropdownOption = this.getDropdownOption(developerField.id, firstDev, customFields);
          if (dropdownOption) {
            developer = dropdownOption.name;
            developerColor = dropdownOption.color;
          }
        } else if (firstDev && firstDev.name) {
          developer = firstDev.name;
        } else if (firstDev && firstDev.username) {
          developer = firstDev.username;
        }
      } else if (typeof developerField.value === 'object') {
        // Handle object values (user objects, dropdown selections, etc.)
        const valueObj = developerField.value as Record<string, unknown>;
        if (valueObj.name && typeof valueObj.name === 'string') {
          developer = valueObj.name;
        } else if (valueObj.username && typeof valueObj.username === 'string') {
          developer = valueObj.username;
        } else if (valueObj.email && typeof valueObj.email === 'string') {
          developer = valueObj.email;
        } else if (valueObj.value && typeof valueObj.value === 'string') {
          // Some dropdown fields have nested value property
          developer = valueObj.value;
        }
      }
    }

    // No fallback to assignee - if no developer field value, leave as undefined to show "Unassigned"

    // Check for Priority in custom fields (similar to Developer)
    const priorityField = task.custom_fields.find(field => {
      const fieldName = field.name.toLowerCase();
      return fieldName === 'priority' ||
             fieldName === 'priorities' ||
             fieldName.includes('priority');
    });

    let priority: { name: string; color: string } | undefined;
    
    // First try built-in priority field
    if (task.priority) {
      priority = {
        name: task.priority.priority,
        color: task.priority.color,
      };
    }
    // Then check custom field
    else if (priorityField && priorityField.value !== undefined && priorityField.value !== null) {
      // Handle dropdown field for priority
      if (typeof priorityField.value === 'number') {
        const dropdownOption = this.getDropdownOption(priorityField.id, priorityField.value, customFields);
        if (dropdownOption) {
          priority = {
            name: dropdownOption.name,
            color: dropdownOption.color
          };
        }
      } else if (typeof priorityField.value === 'string') {
        priority = {
          name: priorityField.value,
          color: '#6B7280' // Default gray color
        };
      }
    }

    // Developer processing complete

    const inProgressSince = inProgressTimestamps.get(task.id);

    return {
      id: task.id,
      name: task.name,
      status: task.status.status,
      statusColor: task.status.color,
      priority,
      timeEstimate: task.time_estimate,
      developer,
      developerColor,
      dueDate: task.due_date,
      comments: commentsResponse.comments,
      subtasks: [], // Will be populated by parent processing
      isSubtask,
      parentId,
      inProgressSince,
    };
  }

  /**
   * Get all spaces for the team
   * @returns Promise<any[]>
   */
  async getSpaces(): Promise<ClickUpSpace[]> {
    try {
      const response = await this.client.get(`/team/${this.teamId}/space`);
      return response.data.spaces;
    } catch (error) {
      console.error('Error fetching spaces:', error);
      throw new Error('Failed to fetch spaces');
    }
  }

  /**
   * Get all lists in a space
   * @param spaceId - The space ID
   * @returns Promise<any[]>
   */
  async getListsInSpace(spaceId: string): Promise<ClickUpList[]> {
    try {
      const response = await this.client.get(`/space/${spaceId}/list`);
      return response.data.lists;
    } catch (error) {
      console.error(`Error fetching lists for space ${spaceId}:`, error);
      return [];
    }
  }

  /**
   * Get all folders in a space
   * @param spaceId - The space ID
   * @returns Promise<any[]>
   */
  async getFoldersInSpace(spaceId: string): Promise<ClickUpFolder[]> {
    try {
      const response = await this.client.get(`/space/${spaceId}/folder`);
      return response.data.folders;
    } catch (error) {
      console.error(`Error fetching folders for space ${spaceId}:`, error);
      return [];
    }
  }

  /**
   * Get all lists in a folder
   * @param folderId - The folder ID
   * @returns Promise<any[]>
   */
  async getListsInFolder(folderId: string): Promise<ClickUpList[]> {
    try {
      const response = await this.client.get(`/folder/${folderId}/list`);
      return response.data.lists;
    } catch (error) {
      console.error(`Error fetching lists for folder ${folderId}:`, error);
      return [];
    }
  }

  /**
   * Get team information
   * @returns Promise<any>
   */
  async getTeam(): Promise<ClickUpTeam> {
    try {
      const response = await this.client.get(`/team/${this.teamId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team info:', error);
      throw new Error('Failed to fetch team information');
    }
  }

  /**
   * Test the API connection
   * @returns Promise<boolean>
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/user');
      return true;
    } catch (error) {
      console.error('ClickUp API connection test failed:', error);
      return false;
    }
  }

  /**
   * Create a new task in ClickUp
   * @param taskData - Task creation data
   * @returns Promise<ClickUpTask>
   */
  async createTask(taskData: TaskCreateData): Promise<ClickUpTask> {
    try {
      console.log('Creating task with data:', taskData);
      
      const response = await this.retryRequest(() =>
        this.client.post<ClickUpTask>(`/list/${this.listId}/task`, taskData)
      );

      console.log('Task created successfully:', response.data);
      return response.data;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Error creating task in ClickUp:', {
        message: apiError.message,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        listId: this.listId,
      });
      
      if (apiError.response?.status === 400) {
        const errorData = apiError.response?.data as { err?: string };
        throw new Error(`Invalid task data. Please check your input: ${errorData?.err || apiError.message}`);
      } else if (apiError.response?.status === 401) {
        throw new Error('Invalid ClickUp API token. Please check your credentials.');
      } else if (apiError.response?.status === 403) {
        throw new Error('Access denied. Please check your ClickUp permissions for this list.');
      } else {
        throw new Error(`Failed to create task in ClickUp: ${apiError.message}`);
      }
    }
  }

  /**
   * Update an existing task in ClickUp
   * @param taskId - The ID of the task to update
   * @param updateData - Task update data
   * @returns Promise<ClickUpTask>
   */
  async updateTask(taskId: string, updateData: TaskUpdateData): Promise<ClickUpTask> {
    try {
      console.log('Updating task with data:', updateData);
      
      const response = await this.retryRequest(() =>
        this.client.put<ClickUpTask>(`/task/${taskId}`, updateData)
      );

      console.log('Task updated successfully:', response.data);
      return response.data;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Error updating task in ClickUp:', {
        message: apiError.message,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        taskId,
      });
      
      if (apiError.response?.status === 400) {
        const errorData = apiError.response?.data as { err?: string };
        throw new Error(`Invalid task data. Please check your input: ${errorData?.err || apiError.message}`);
      } else if (apiError.response?.status === 401) {
        throw new Error('Invalid ClickUp API token. Please check your credentials.');
      } else if (apiError.response?.status === 403) {
        throw new Error('Access denied. Please check your ClickUp permissions for this task.');
      } else if (apiError.response?.status === 404) {
        throw new Error('Task not found. It may have been deleted.');
      } else {
        throw new Error(`Failed to update task in ClickUp: ${apiError.message}`);
      }
    }
  }

  /**
   * Get available statuses for the list
   * @returns Promise<any[]>
   */
  async getStatuses(): Promise<ClickUpStatus[]> {
    try {
      const response = await this.retryRequest(() =>
        this.client.get(`/list/${this.listId}`)
      );
      
      return response.data.statuses || [];
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Error fetching statuses:', apiError.message);
      return [];
    }
  }

  /**
   * Get team members
   * @returns Promise<any[]>
   */
  async getTeamMembers(): Promise<Array<{ user: { id: number; username: string; color: string; profilePicture?: string } }>> {
    try {
      const response = await this.retryRequest(() =>
        this.client.get(`/team/${this.teamId}/member`)
      );
      
      return response.data.members || [];
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Error fetching team members:', apiError.message);
      return [];
    }
  }
}

// Export a singleton instance
export const clickupAPI = new ClickUpAPI();
export default ClickUpAPI;