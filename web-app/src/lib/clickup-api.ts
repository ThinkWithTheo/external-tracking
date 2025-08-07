import axios, { AxiosInstance } from 'axios';
import { ClickUpTask, ClickUpListResponse, ClickUpCommentsResponse, ProcessedTask } from '@/types/clickup';

class ClickUpAPI {
  private client: AxiosInstance;
  private apiToken: string;
  private listId: string;
  private teamId: string;

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
      timeout: 10000,
    });
  }

  /**
   * Fetch tasks from the specified ClickUp list
   * @param includeSubtasks - Whether to include subtasks in the response
   * @param includeClosed - Whether to include closed tasks
   * @returns Promise<ClickUpTask[]>
   */
  async getTasks(includeSubtasks: boolean = true, includeClosed: boolean = false): Promise<ClickUpTask[]> {
    try {
      const params: any = {
        archived: false,
        subtasks: includeSubtasks,
        include_closed: includeClosed,
      };

      console.log(`Fetching tasks from list: ${this.listId} with params:`, params);
      
      const response = await this.client.get<ClickUpListResponse>(`/list/${this.listId}/task`, {
        params,
      });

      console.log(`Successfully fetched ${response.data.tasks.length} tasks`);
      return response.data.tasks;
    } catch (error: any) {
      console.error('Error fetching tasks from ClickUp:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        listId: this.listId,
      });
      
      if (error.response?.status === 400) {
        throw new Error(`Invalid request to ClickUp API. Please check your List ID: ${this.listId}`);
      } else if (error.response?.status === 401) {
        throw new Error('Invalid ClickUp API token. Please check your credentials.');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied. Please check your ClickUp permissions for this list.');
      } else {
        throw new Error(`Failed to fetch tasks from ClickUp: ${error.message}`);
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
      const response = await this.client.get<ClickUpCommentsResponse>(`/task/${taskId}/comment`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching comments for task ${taskId}:`, error);
      return { comments: [] };
    }
  }

  /**
   * Process raw ClickUp tasks into our UI-friendly format
   * @param tasks - Raw ClickUp tasks
   * @returns Promise<ProcessedTask[]>
   */
  async processTasksForUI(tasks: ClickUpTask[]): Promise<ProcessedTask[]> {
    // Filter out closed tasks
    const openTasks = tasks.filter(task => 
      task.status.type !== 'closed' && 
      task.status.status.toLowerCase() !== 'closed' &&
      !task.archived
    );

    // Separate main tasks and subtasks
    const mainTasks = openTasks.filter(task => !task.parent);
    const subtasks = openTasks.filter(task => task.parent);

    // Process main tasks
    const processedTasks: ProcessedTask[] = [];

    for (const task of mainTasks) {
      const processedTask = await this.processTask(task, false);
      
      // Find and process subtasks for this main task
      const taskSubtasks = subtasks.filter(subtask => subtask.parent === task.id);
      processedTask.subtasks = [];

      for (const subtask of taskSubtasks) {
        const processedSubtask = await this.processTask(subtask, true, task.id);
        processedTask.subtasks.push(processedSubtask);
      }

      processedTasks.push(processedTask);
    }

    return processedTasks;
  }

  /**
   * Process a single task into UI format
   * @param task - Raw ClickUp task
   * @param isSubtask - Whether this is a subtask
   * @param parentId - Parent task ID if this is a subtask
   * @returns Promise<ProcessedTask>
   */
  private async processTask(task: ClickUpTask, isSubtask: boolean, parentId?: string): Promise<ProcessedTask> {
    // Get comments for this task
    const commentsResponse = await this.getTaskComments(task.id);

    // Find developer from custom fields
    const developerField = task.custom_fields.find(field => 
      field.name.toLowerCase().includes('developer') || 
      field.name.toLowerCase().includes('assignee')
    );

    let developer: string | undefined;
    if (developerField && developerField.value) {
      if (typeof developerField.value === 'string') {
        developer = developerField.value;
      } else if (developerField.value.name) {
        developer = developerField.value.name;
      } else if (developerField.value.username) {
        developer = developerField.value.username;
      }
    }

    // If no developer in custom fields, use first assignee
    if (!developer && task.assignees.length > 0) {
      developer = task.assignees[0].username;
    }

    return {
      id: task.id,
      name: task.name,
      status: task.status.status,
      statusColor: task.status.color,
      priority: task.priority ? {
        name: task.priority.priority,
        color: task.priority.color,
      } : undefined,
      timeEstimate: task.time_estimate,
      developer,
      dueDate: task.due_date,
      comments: commentsResponse.comments,
      subtasks: [], // Will be populated by parent processing
      isSubtask,
      parentId,
    };
  }

  /**
   * Get all spaces for the team
   * @returns Promise<any[]>
   */
  async getSpaces(): Promise<any[]> {
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
  async getListsInSpace(spaceId: string): Promise<any[]> {
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
  async getFoldersInSpace(spaceId: string): Promise<any[]> {
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
  async getListsInFolder(folderId: string): Promise<any[]> {
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
  async getTeam(): Promise<any> {
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
}

// Export a singleton instance
export const clickupAPI = new ClickUpAPI();
export default ClickUpAPI;