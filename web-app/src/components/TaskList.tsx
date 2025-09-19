'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProcessedTask } from '@/types/clickup';
import TaskRow from './TaskRow';
import { TaskGrid } from './task/TaskCard';
import { TaskSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { RefreshCw, AlertCircle, Clock, User, Calendar, Flag, Grid3X3, List, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskListProps {
  className?: string;
  tasks?: ProcessedTask[];
  onCreateTask?: () => void;
  onTaskClick?: (taskId: string) => void;
  onRefresh?: () => void;
}

type ViewMode = 'cards' | 'table';

const TaskList: React.FC<TaskListProps> = ({
  className = '',
  tasks: propTasks,
  onCreateTask,
  onTaskClick,
  onRefresh
}) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isAdmin, setIsAdmin] = useState(false);

  // Use prop tasks if provided, otherwise use an empty array
  const tasks = propTasks || [];
  const loading = !propTasks;
  const error = null; // Error handling will be managed by the parent component

  // Check admin status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminStatus = localStorage.getItem('trackingAdmin') === 'true';
      setIsAdmin(adminStatus);
    }
  }, []);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleToggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };


  const getTotalSubtasks = () => {
    return tasks.reduce((acc, task) => acc + (task.subtasks?.length || 0), 0);
  };

  const getTotalHours = () => {
    let totalHours = 0;
    tasks.forEach(task => {
      task.subtasks?.forEach(subtask => {
        totalHours += (subtask.timeEstimate || 0) / (1000 * 60 * 60);
      });
    });
    return totalHours;
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header with skeleton */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center space-x-4">
            <div className="h-6 w-16 bg-[var(--color-border-light)] rounded animate-shimmer" />
            <div className="h-4 w-32 bg-[var(--color-border-light)] rounded animate-shimmer" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-20 bg-[var(--color-border-light)] rounded animate-shimmer" />
            <div className="h-8 w-8 bg-[var(--color-border-light)] rounded animate-shimmer" />
          </div>
        </div>
        
        {/* Skeleton content */}
        <div className="p-4">
          {viewMode === 'cards' ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-48 bg-[var(--color-border-light)] rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, index) => (
                <TaskSkeleton key={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600 mb-4">
          <AlertCircle className="w-5 h-5" />
          <span>Error loading tasks</span>
        </div>
        <p className="text-gray-600 text-sm mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={cn("bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)]", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Tasks</h2>
            <div className="flex items-center space-x-2 text-sm text-[var(--color-text-secondary)]">
              <span>{tasks.length} tasks</span>
              <span>•</span>
              <span>{getTotalSubtasks()} subtasks</span>
              <span>•</span>
              <span className="font-medium text-[var(--color-warning-600)]">
                {getTotalHours().toFixed(1)}h total
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View Toggle */}
            <div className="flex items-center bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-1">
              <Button
                variant={viewMode === 'cards' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="h-7 px-2"
              >
                <Grid3X3 className="h-3 w-3 mr-1" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-7 px-2"
              >
                <List className="h-3 w-3 mr-1" />
                Table
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
              className="h-8 w-8"
              title="Refresh tasks"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>

            {/* New Item Button - text changes based on admin status */}
            {onCreateTask && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onCreateTask}
                  className="hidden sm:flex h-7 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {isAdmin ? 'New Review Item' : 'New Item'}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={onCreateTask}
                  className="sm:hidden h-7 w-7"
                  aria-label={isAdmin ? "Create new review item" : "Create new item"}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {viewMode === 'cards' ? (
          <TaskGrid
            tasks={tasks}
            expandedTasks={expandedTasks}
            onToggleExpand={handleToggleExpand}
            onTaskClick={onTaskClick}
          />
        ) : (
          <div className="space-y-0">
            {/* Table Column Headers */}
            <div className="flex items-center py-2 px-4 bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide rounded-t-lg">
              <div className="w-6 mr-2"></div> {/* Expand/collapse column */}
              
              <div className="flex-1 min-w-0 pr-4">
                <span>Name</span>
              </div>
              
              <div className="w-20 text-center px-2">
                <div className="flex items-center justify-center">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>Time</span>
                </div>
              </div>
              
              <div className="w-32 text-center px-2">
                <div className="flex items-center justify-center">
                  <User className="w-3 h-3 mr-1" />
                  <span>Developer</span>
                </div>
              </div>
              
              <div className="w-24 text-center px-2">
                <span>Status</span>
              </div>
              
              <div className="w-20 text-center px-2">
                <div className="flex items-center justify-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>Due</span>
                </div>
              </div>
              
              <div className="w-20 text-center px-2">
                <div className="flex items-center justify-center">
                  <Flag className="w-3 h-3 mr-1" />
                  <span>Priority</span>
                </div>
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-[var(--color-border-light)] border border-[var(--color-border)] rounded-b-lg">
              {tasks.length === 0 ? (
                <div className="py-12 text-center text-[var(--color-text-muted)]">
                  <p className="text-lg">No open tasks found</p>
                  <p className="text-sm mt-1">All tasks may be closed or there might be no tasks in this list</p>
                </div>
              ) : (
                tasks.map((task, index) => (
                  <TaskRow
                    key={`${task.id}-${index}`}
                    task={task}
                    isExpanded={expandedTasks.has(task.id)}
                    onToggleExpand={() => handleToggleExpand(task.id)}
                    onTaskClick={onTaskClick}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;