import React, { useMemo } from 'react';
import { ProcessedTask } from '@/types/clickup';
import { Clock, User, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { PriorityBadge } from '@/components/ui/Badge';
import { getInProgressDurationInfo } from '@/lib/utils';

interface TaskRowProps {
  task: ProcessedTask;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onTaskClick?: (taskId: string) => void;
  level?: number;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  isExpanded = false,
  onToggleExpand,
  onTaskClick,
  level = 0
}) => {
  const formatTimeEstimate = (timeInMs?: number): string => {
    if (!timeInMs) return '—';
    
    const hours = Math.floor(timeInMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeInMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    }
    return `${minutes}m`;
  };

  const formatDueDate = (dueDateString?: string): string => {
    if (!dueDateString) return '—';
    
    try {
      const dueDate = new Date(parseInt(dueDateString));
      return format(dueDate, 'MMM d');
    } catch {
      return '—';
    }
  };

  const getPriorityColor = (priority?: { name: string; color: string }): string => {
    if (!priority) return 'transparent';
    return priority.color;
  };

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const indentLevel = level * 24; // 24px per level

  // Calculate parent task values based on child tasks
  const parentTaskData = useMemo(() => {
    if (!hasSubtasks || task.isSubtask) {
      return {
        timeEstimate: task.timeEstimate,
        developer: task.developer,
        status: task.status,
        statusColor: task.statusColor,
        dueDate: task.dueDate,
        priority: task.priority
      };
    }

    // Calculate total time from subtasks
    const totalTime = task.subtasks.reduce((sum, subtask) => sum + (subtask.timeEstimate || 0), 0);

    // Find most common developer
    const developerCounts: Record<string, number> = {};
    task.subtasks.forEach(subtask => {
      if (subtask.developer) {
        developerCounts[subtask.developer] = (developerCounts[subtask.developer] || 0) + 1;
      }
    });
    const mostCommonDeveloper = Object.keys(developerCounts).length > 0
      ? Object.entries(developerCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : task.developer;

    // Check if any subtask is in progress
    const hasInProgressSubtask = task.subtasks.some(subtask =>
      subtask.status?.toLowerCase().includes('progress') ||
      subtask.status?.toLowerCase().includes('active') ||
      subtask.status?.toLowerCase().includes('working')
    );
    const status = hasInProgressSubtask ? 'IN PROGRESS' : task.status;
    const statusColor = hasInProgressSubtask ? '#1090e0' : task.statusColor;

    // Find earliest due date
    const dueDates = task.subtasks
      .map(subtask => subtask.dueDate)
      .filter(date => date)
      .map(date => parseInt(date!));
    const earliestDueDate = dueDates.length > 0
      ? Math.min(...dueDates).toString()
      : task.dueDate;

    // Find highest priority
    const priorityOrder: Record<string, number> = {
      'urgent': 1,
      'high': 2,
      'normal': 3,
      'low': 4,
      'none': 5
    };
    
    let highestPriority = task.priority;
    task.subtasks.forEach(subtask => {
      if (subtask.priority) {
        const currentOrder = priorityOrder[task.priority?.name.toLowerCase() || 'none'] || 5;
        const subtaskOrder = priorityOrder[subtask.priority.name.toLowerCase()] || 5;
        if (subtaskOrder < currentOrder) {
          highestPriority = subtask.priority;
        }
      }
    });

    return {
      timeEstimate: totalTime,
      developer: mostCommonDeveloper,
      status,
      statusColor,
      dueDate: earliestDueDate,
      priority: highestPriority
    };
  }, [task, hasSubtasks]);

  return (
    <>
      <div
        className={`
          task-row flex items-center py-2 px-4 border-b border-gray-100 transition-colors
          ${task.isSubtask ? 'bg-gray-25' : 'bg-white'}
        `}
        style={{ paddingLeft: `${16 + indentLevel}px` }}
      >
        {/* Expand/Collapse Button */}
        <div className="w-6 h-6 flex items-center justify-center mr-2">
          {hasSubtasks && (
            <button
              onClick={onToggleExpand}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
        </div>

        {/* Task Name */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center">
            {/* Priority Indicator */}
            {task.priority && (
              <div
                className={`
                  w-2 h-2 rounded-full mr-2 flex-shrink-0
                  ${task.priority.name.toLowerCase() === 'urgent' || task.priority.name.toLowerCase() === 'high' ? 'priority-high' : ''}
                `}
                style={{ backgroundColor: getPriorityColor(task.priority) }}
                title={`Priority: ${task.priority.name}`}
              />
            )}
            
            {/* Task Name */}
            <span
              className={`
                truncate text-sm
                ${task.isSubtask ? 'text-gray-700' : 'text-gray-900 font-medium'}
                ${onTaskClick ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}
              `}
              title={task.name}
              onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
            >
              {task.name}
            </span>
          </div>
        </div>

        {/* In Progress Duration */}
        <div className="w-24 text-center px-2">
          <div className="flex items-center justify-center text-sm text-gray-600">
            {task.status.toLowerCase().includes('progress') && (() => {
              const durationInfo = getInProgressDurationInfo(task.inProgressSince);
              return durationInfo ? (
                <span className={`text-xs font-medium ${durationInfo.color}`}>
                  {durationInfo.duration}
                </span>
              ) : null;
            })()}
          </div>
        </div>

        {/* Time Estimate */}
        <div className="w-20 text-center px-2">
          <div className="flex items-center justify-center text-sm text-gray-600">
            <Clock className="w-3 h-3 mr-1" />
            <span>{formatTimeEstimate(parentTaskData.timeEstimate)}</span>
          </div>
        </div>

        {/* Developer */}
        <div className="w-32 text-center px-2">
          <div className="flex items-center justify-center text-sm text-gray-600">
            <User className="w-3 h-3 mr-1" />
            <span className="truncate" title={parentTaskData.developer || 'Unassigned'}>
              {parentTaskData.developer || '—'}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="w-24 text-center px-2">
          <span
            className="status-badge inline-block px-2 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: parentTaskData.statusColor }}
          >
            {parentTaskData.status}
          </span>
        </div>

        {/* Due Date */}
        <div className="w-20 text-center px-2">
          <div className="flex items-center justify-center text-sm text-gray-600">
            <Calendar className="w-3 h-3 mr-1" />
            <span>{formatDueDate(parentTaskData.dueDate)}</span>
          </div>
        </div>

        {/* Priority */}
        <div className="w-20 text-center px-2">
          <PriorityBadge
            priority={parentTaskData.priority?.name || 'None'}
            color={parentTaskData.priority?.color}
            size="sm"
          />
        </div>
      </div>

      {/* Subtasks */}
      {hasSubtasks && isExpanded && (
        <div>
          {task.subtasks.map((subtask) => (
            <TaskRow
              key={subtask.id}
              task={subtask}
              onTaskClick={onTaskClick}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default TaskRow;