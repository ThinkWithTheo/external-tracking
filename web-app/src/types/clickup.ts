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
  checklists: unknown[];
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
    type_config: Record<string, unknown>;
    date_created: string;
    hide_from_guests: boolean;
    value?: unknown;
  }>;
  dependencies: unknown[];
  linked_tasks: unknown[];
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
  reactions: unknown[];
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

// Additional API types
export interface ClickUpSpace {
  id: string;
  name: string;
  private: boolean;
  statuses: unknown[];
  multiple_assignees: boolean;
  features: Record<string, unknown>;
}

export interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  status?: unknown;
  priority?: unknown;
  assignee?: unknown;
  task_count?: number;
  due_date?: string;
  start_date?: string;
  folder: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  };
  space: {
    id: string;
    name: string;
    access: boolean;
  };
  archived: boolean;
}

export interface ClickUpFolder {
  id: string;
  name: string;
  orderindex: number;
  override_statuses: boolean;
  hidden: boolean;
  space: {
    id: string;
    name: string;
    access: boolean;
  };
  task_count: string;
  archived: boolean;
  statuses: unknown[];
  lists: ClickUpList[];
}

export interface ClickUpTeam {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  members: Array<{
    user: {
      id: number;
      username: string;
      color: string;
      profilePicture?: string;
    };
  }>;
}

export interface ClickUpStatus {
  id: string;
  status: string;
  orderindex: number;
  color: string;
  type: string;
}

export interface ClickUpCustomField {
  id: string;
  name: string;
  type: string;
  type_config?: {
    default?: unknown;
    placeholder?: string;
    new_drop_down?: boolean;
    options?: Array<{
      id: string | number;
      name: string;
      color?: string;
      orderindex?: number;
    }>;
  };
  date_created: string;
  hide_from_guests: boolean;
  required?: boolean;
}

export interface TaskCreateData {
  name: string;
  description?: string;
  status?: string;
  priority?: number;
  due_date?: number;
  time_estimate?: number;
  assignees?: number[];
  custom_fields?: Array<{
    id: string;
    value: unknown;
  }>;
  parent?: string;
  developer?: string;
}

export interface TaskUpdateData {
  name?: string;
  description?: string;
  status?: string;
  priority?: number;
  due_date?: number;
  time_estimate?: number;
  assignees?: number[];
  custom_fields?: Array<{
    id: string;
    value: unknown;
  }>;
  developer?: string;
  comment?: string;
  parent?: string;
}

export interface ApiError {
  message: string;
  response?: {
    status: number;
    statusText: string;
    data: unknown;
  };
}