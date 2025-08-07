'use client';

import React, { useState, useEffect } from 'react';
import { ProcessedTask } from '@/types/clickup';
import TaskRow from './TaskRow';
import { RefreshCw, AlertCircle, Clock, User, Calendar, MessageCircle, Flag } from 'lucide-react';

interface TaskListProps {
  className?: string;
}

const TaskList: React.FC<TaskListProps> = ({ className = '' }) => {
  const [tasks, setTasks] = useState<ProcessedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/tasks');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tasks');
      }
      
      setTasks(data.tasks);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

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

  const handleRefresh = () => {
    fetchTasks();
  };

  const getTotalSubtasks = () => {
    return tasks.reduce((acc, task) => acc + task.subtasks.length, 0);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="flex items-center space-x-2 text-gray-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading tasks...</span>
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
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{tasks.length} tasks</span>
              <span>•</span>
              <span>{getTotalSubtasks()} subtasks</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {lastRefresh && (
              <span className="text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
              title="Refresh tasks"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex items-center py-2 px-4 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-700 uppercase tracking-wide">
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
        
        <div className="w-20 text-center px-2">
          <div className="flex items-center justify-center">
            <MessageCircle className="w-3 h-3 mr-1" />
            <span>Comments</span>
          </div>
        </div>
      </div>

      {/* Task Rows */}
      <div className="divide-y divide-gray-100">
        {tasks.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <p>No open tasks found</p>
            <p className="text-sm mt-1">All tasks may be closed or there might be no tasks in this list</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isExpanded={expandedTasks.has(task.id)}
              onToggleExpand={() => handleToggleExpand(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TaskList;