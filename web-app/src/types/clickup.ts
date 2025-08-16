// ClickUp API Types
export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  status: {
    id: string;
    status: string;
    color: string;
    type: string;
    orderindex: number;
  };
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed?: string;
  date_done?: string;
  archived: boolean;
  creator: {
    id: number;
    username: string;
    color: string;
    email: string;
    profilePicture?: string;
  };
  assignees: Array<{
    id: number;
    username: string;
    color: string;
    email: string;
    profilePicture?: string;
  }>;
  watchers: Array<{
    id: number;
    username: string;
    color: string;
    email: string;
    profilePicture?: string;
  }>;
  checklists: any[];
  tags: Array<{
    name: string;
    tag_fg: string;
    tag_bg: string;
    creator: number;
  }>;
  parent?: string;
  priority?: {
    id: string;
    priority: string;
    color: string;
    orderindex: string;
  };
  due_date?: string;
  start_date?: string;
  points?: number;
  time_estimate?: number;
  time_spent?: number;
  custom_fields: Array<{
    id: string;
    name: string;
    type: string;
    type_config: any;
    date_created: string;
    hide_from_guests: boolean;
    value?: any;
  }>;
  dependencies: any[];
  linked_tasks: any[];
  team_id: string;
  url: string;
  permission_level: string;
  list: {
    id: string;
    name: string;
    access: boolean;
  };
  project: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  };
  folder: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  };
  space: {
    id: string;
  };
  subtasks?: ClickUpTask[];
}

export interface ClickUpListResponse {
  tasks: ClickUpTask[];
  last_page?: boolean;
}

export interface ClickUpComment {
  id: string;
  comment: Array<{
    text: string;
    type: string;
  }>;
  comment_text: string;
  user: {
    id: number;
    username: string;
    color: string;
    email: string;
    profilePicture?: string;
  };
  resolved: boolean;
  assignee?: {
    id: number;
    username: string;
    color: string;
    email: string;
    profilePicture?: string;
  };
  assigned_by?: {
    id: number;
    username: string;
    color: string;
    email: string;
    profilePicture?: string;
  };
  reactions: any[];
  date: string;
}

export interface ClickUpCommentsResponse {
  comments: ClickUpComment[];
}

// Processed types for our UI
export interface ProcessedTask {
  id: string;
  name: string;
  status: string;
  statusColor: string;
  priority?: {
    name: string;
    color: string;
  };
  timeEstimate?: number;
  developer?: string;
  developerColor?: string;
  dueDate?: string;
  comments: ClickUpComment[];
  subtasks: ProcessedTask[];
  isSubtask: boolean;
  parentId?: string;
}