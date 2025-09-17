'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, User, Flag, Save, Loader2, Lock } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ClickUpTask, TaskUpdateData } from '@/types/clickup';

interface UpdateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  task: ClickUpTask | null;
}

interface TaskFormData {
  name: string;
  description: string;
  status: string;
  priority: number | null;
  dueDate: string;
  timeEstimate: string;
  developer: string;
  parent: string;
}

const UpdateTaskModal: React.FC<UpdateTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskUpdated,
  task
}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    description: '',
    status: '',
    priority: null,
    dueDate: '',
    timeEstimate: '',
    developer: '',
    parent: ''
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [statuses, setStatuses] = useState<Array<{ id: string; status: string; color: string }>>([]);
  const [developerOptions, setDeveloperOptions] = useState<Array<{ id: string | number; name: string; color?: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [originalData, setOriginalData] = useState<TaskFormData | null>(null);
  const [isFullEditAllowed, setIsFullEditAllowed] = useState(false);
  const [parentTasks, setParentTasks] = useState<Array<{ id: string; name: string }>>([]);

  // Check if user has admin privileges for full editing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAdmin = localStorage.getItem('trackingAdmin') === 'true';
      setIsFullEditAllowed(isAdmin);
    }
  }, [isOpen]); // Re-check when modal opens

  // Priority options
  const priorities = [
    { id: 1, name: 'Urgent', color: '#f87171' },
    { id: 2, name: 'High', color: '#fb923c' },
    { id: 3, name: 'Normal', color: '#60a5fa' },
    { id: 4, name: 'Low', color: '#a3a3a3' }
  ];

  // Load task data when modal opens or task changes
  useEffect(() => {
    if (isOpen && task) {
      loadTaskData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, task]);

  const loadTaskData = useCallback(async () => {
    if (!task) return;
    
    setLoadingData(true);
    try {
      // Fetch developer options from the API
      const response = await fetch('/api/tasks/developers');
      if (response.ok) {
        const data = await response.json();
        const sortedDevelopers = (data.developers || []).sort((a: { name: string; }, b: { name: string; }) => a.name.localeCompare(b.name));
        setDeveloperOptions(sortedDevelopers);
      }

      // Fetch all tasks to get parent task options
      const tasksResponse = await fetch('/api/tasks');
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        // Filter out subtasks and the current task itself to get only parent tasks
        const availableParents = tasksData.tasks
          .filter((t: { isSubtask: boolean; id: string }) => !t.isSubtask && t.id !== task.id)
          .map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }))
          .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
        setParentTasks(availableParents);
      }

      // Use ClickUp status names based on the available statuses
      const defaultStatuses = [
        { id: '1', status: 'OPEN' },
        { id: '2', status: 'IN PROGRESS' },
        { id: '3', status: 'IN REVIEW' },
        { id: '4', status: 'BLOCKED' },
        { id: '5', status: 'WONT DO' },
        { id: '6', status: 'CLOSED' }
      ];

      setStatuses(defaultStatuses.map(status => ({ ...status, color: '#64748b' })));
      
      // Extract developer from custom fields
      const developerField = task.custom_fields?.find(field =>
        field.name.toLowerCase().includes('developer')
      );
      
      let developerValue = '';
      if (developerField?.value !== undefined && developerField?.value !== null) {
        if (typeof developerField.value === 'string') {
          // Find the name from the developer options based on the UUID
          const matchingDev = developerOptions.find(d => d.id === developerField.value);
          developerValue = matchingDev ? matchingDev.name : '';
        } else if (typeof developerField.value === 'number') {
          // The value is the orderindex of the dropdown option
          if (developerField.type_config?.options && Array.isArray(developerField.type_config.options)) {
            const options = developerField.type_config.options as Array<{
              orderindex?: number;
              name: string;
            }>;
            const matchingOption = options.find((opt) => opt.orderindex === developerField.value);
            if (matchingOption) {
              developerValue = matchingOption.name;
            }
          }
        }
      }

      // Convert time estimate from milliseconds to hours
      const timeEstimateHours = task.time_estimate ? (task.time_estimate / (60 * 60 * 1000)).toString() : '';
      
      // Convert due date from timestamp to date string
      const dueDateString = task.due_date ? new Date(parseInt(task.due_date)).toISOString().split('T')[0] : '';

      // Get priority
      let priorityValue = null;
      if (task.priority) {
        // ClickUp priority IDs match our button IDs directly
        // priority.id is a string like "1", "2", "3", "4"
        // where 1=Urgent, 2=High, 3=Normal, 4=Low
        priorityValue = parseInt(task.priority.id) || null;
        
        // Fallback to name-based mapping if ID parsing fails
        if (!priorityValue) {
          const priorityMap: Record<string, number> = {
            'urgent': 1,
            'high': 2,
            'normal': 3,
            'low': 4
          };
          priorityValue = priorityMap[task.priority.priority.toLowerCase()] || null;
        }
      }

      // Normalize the status value to match dropdown options
      // ClickUp might return status in different casing, so we need to normalize it
      let statusValue = task.status?.status || '';
      
      // Map common status variations to our standard format
      const statusMap: Record<string, string> = {
        'open': 'OPEN',
        'in progress': 'IN PROGRESS',
        'in_progress': 'IN PROGRESS',
        'inprogress': 'IN PROGRESS',
        'in review': 'IN REVIEW',
        'in_review': 'IN REVIEW',
        'inreview': 'IN REVIEW',
        'blocked': 'BLOCKED',
        'wont do': 'WONT DO',
        'wont_do': 'WONT DO',
        'wontdo': 'WONT DO',
        'closed': 'CLOSED',
        'complete': 'CLOSED',
        'done': 'CLOSED'
      };
      
      // Try to find a matching status in our map (case-insensitive)
      const normalizedStatus = statusValue.toLowerCase().trim();
      if (statusMap[normalizedStatus]) {
        statusValue = statusMap[normalizedStatus];
      } else {
        // If not in map, try to match with our default statuses (case-insensitive)
        const matchingStatus = defaultStatuses.find(
          s => s.status.toLowerCase() === normalizedStatus
        );
        if (matchingStatus) {
          statusValue = matchingStatus.status;
        } else {
          // As a fallback, convert to uppercase which is our standard format
          statusValue = statusValue.toUpperCase();
        }
      }

      // Set form data with task values
      const taskFormData: TaskFormData = {
        name: task.name || '',
        description: task.description || '',
        status: statusValue,
        priority: priorityValue,
        dueDate: dueDateString,
        timeEstimate: timeEstimateHours,
        developer: developerValue,
        parent: task.parent || ''
      };

      setFormData(taskFormData);
      setOriginalData(taskFormData);
    } catch (error) {
      console.error('Error loading task data:', error);
      setErrors({ load: 'Failed to load task data' });
    } finally {
      setLoadingData(false);
    }
  }, [task, developerOptions]);

  const handleInputChange = (field: keyof TaskFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Task name is required';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getChangedFields = (): Partial<TaskUpdateData> => {
    if (!originalData || !task) return {};
    
    const changes: Partial<TaskUpdateData> = {};
    
    // Check each field for changes
    if (formData.name !== originalData.name) {
      changes.name = formData.name;
    }
    
    if (formData.description !== originalData.description) {
      changes.description = formData.description || undefined;
    }
    
    if (formData.status !== originalData.status) {
      changes.status = formData.status;
    }
    
    if (formData.priority !== originalData.priority) {
      changes.priority = formData.priority || undefined;
    }
    
    if (formData.dueDate !== originalData.dueDate) {
      changes.due_date = formData.dueDate ? new Date(formData.dueDate).getTime() : undefined;
    }
    
    if (formData.timeEstimate !== originalData.timeEstimate) {
      changes.time_estimate = formData.timeEstimate ? parseInt(formData.timeEstimate) * 60 * 60 * 1000 : undefined;
    }
    
    if (formData.developer !== originalData.developer) {
      changes.developer = formData.developer || undefined;
    }
    
    if (formData.parent !== originalData.parent) {
      changes.parent = formData.parent || undefined;
    }
    
    return changes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !task) {
      return;
    }

    const changes = getChangedFields();
    
    // If no changes were made, just close the modal
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    setLoading(true);

    try {
      // Update the task via API
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changes),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update task');
      }

      // Notify parent component
      onTaskUpdated();
      onClose();
    } catch (error: unknown) {
      const apiError = error as { message?: string };
      console.error('Error updating task:', error);
      setErrors({ submit: apiError.message || 'Failed to update task' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      // Reset form when closing
      setFormData({
        name: '',
        description: '',
        status: '',
        priority: null,
        dueDate: '',
        timeEstimate: '',
        developer: '',
        parent: ''
      });
      setOriginalData(null);
      setErrors({});
    }
  };

  if (!task) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Update Task"
      size="lg"
    >
      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary-500)]" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Task ID:</span> {task.id}
            </div>
            {!isFullEditAllowed && (
              <div className="text-sm text-orange-700 mt-2 flex items-center">
                <Lock className="w-3 h-3 mr-1" />
                <span className="font-medium">Limited Edit Mode:</span> Only description can be updated
              </div>
            )}
          </div>

          {/* Parent Task - At the top as requested */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Parent Task
              {!isFullEditAllowed && (
                <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                  <Lock className="w-3 h-3 inline mr-1" />
                  Admin only
                </span>
              )}
            </label>
            <select
              value={formData.parent}
              onChange={(e) => handleInputChange('parent', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors"
              disabled={loading || !isFullEditAllowed}
            >
              <option value="">No parent (top-level task)</option>
              {parentTasks.map((parentTask) => (
                <option key={parentTask.id} value={parentTask.id}>
                  {parentTask.name}
                </option>
              ))}
            </select>
            {task.parent && !isFullEditAllowed && (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Current parent: {parentTasks.find(p => p.id === task.parent)?.name || task.parent}
              </p>
            )}
          </div>

          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Task Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={cn(
                "w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors",
                errors.name ? "border-[var(--color-error-500)]" : "border-[var(--color-border)]"
              )}
              placeholder="Enter task name..."
              disabled={loading || !isFullEditAllowed}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-[var(--color-error-500)]">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors resize-none"
              placeholder="Enter task description..."
              disabled={loading}
            />
          </div>

          {/* Row 1: Status and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className={cn(
                  "w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors",
                  errors.status ? "border-[var(--color-error-500)]" : "border-[var(--color-border)]"
                )}
                disabled={loading || !isFullEditAllowed}
              >
                <option value="">Select status...</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.status}>
                    {status.status}
                  </option>
                ))}
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-[var(--color-error-500)]">{errors.status}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Priority
              </label>
              <div className="flex flex-wrap gap-2">
                {priorities.map((priority) => (
                  <button
                    key={priority.id}
                    type="button"
                    onClick={() => handleInputChange('priority', formData.priority === priority.id ? null : priority.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
                      formData.priority === priority.id
                        ? "ring-2 ring-offset-2 ring-[var(--color-primary-500)]"
                        : "hover:scale-105"
                    )}
                    style={{
                      backgroundColor: formData.priority === priority.id ? priority.color : `${priority.color}80`,
                      color: 'white'
                    }}
                    disabled={loading || !isFullEditAllowed}
                  >
                    <Flag className="w-3 h-3 inline mr-1" />
                    {priority.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Due Date and Time Estimate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors"
                disabled={loading || !isFullEditAllowed}
              />
            </div>

            {/* Time Estimate */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Time Estimate (hours)
              </label>
              <input
                type="number"
                value={formData.timeEstimate}
                onChange={(e) => handleInputChange('timeEstimate', e.target.value)}
                min="0"
                step="0.5"
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors"
                placeholder="e.g., 2.5"
                disabled={loading || !isFullEditAllowed}
              />
            </div>
          </div>

          {/* Developer */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Developer
            </label>
            <select
              value={formData.developer}
              onChange={(e) => handleInputChange('developer', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors"
              disabled={loading || !isFullEditAllowed}
            >
              <option value="">Select developer...</option>
              {developerOptions.map((dev) => (
                <option key={dev.id} value={dev.name}>
                  {dev.name}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-[var(--color-error-50)] border border-[var(--color-error-200)] rounded-md">
              <p className="text-sm text-[var(--color-error-700)]">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-1" />
              Update Task
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default UpdateTaskModal;