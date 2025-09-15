'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Flag, MessageSquare, Save, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
  comments: string;
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
    comments: ''
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [statuses, setStatuses] = useState<Array<{ id: string; status: string; color: string }>>([]);
  const [developerOptions, setDeveloperOptions] = useState<Array<{ id: string | number; name: string; color?: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [originalData, setOriginalData] = useState<TaskFormData | null>(null);

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
  }, [isOpen, task]);

  const loadTaskData = async () => {
    if (!task) return;
    
    setLoadingData(true);
    try {
      // Fetch developer options from the API
      const response = await fetch('/api/tasks/developers');
      if (response.ok) {
        const data = await response.json();
        setDeveloperOptions(data.developers || []);
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
          developerValue = developerField.value;
        } else if (typeof developerField.value === 'number') {
          // The value is the orderindex of the dropdown option
          // We need to find the matching option name from the type_config
          if (developerField.type_config?.options && Array.isArray(developerField.type_config.options)) {
            const options = developerField.type_config.options as any[];
            const matchingOption = options.find((opt: any) => opt.orderindex === developerField.value);
            if (matchingOption) {
              developerValue = matchingOption.name;
            }
          }
        } else if (typeof developerField.value === 'object' && developerField.value !== null) {
          const valueObj = developerField.value as any;
          developerValue = valueObj.name || valueObj.username || valueObj.value || '';
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

      // Set form data with task values
      const taskFormData: TaskFormData = {
        name: task.name || '',
        description: task.description || '',
        status: task.status?.status || '',
        priority: priorityValue,
        dueDate: dueDateString,
        timeEstimate: timeEstimateHours,
        developer: developerValue,
        comments: ''
      };

      setFormData(taskFormData);
      setOriginalData(taskFormData);
    } catch (error) {
      console.error('Error loading task data:', error);
      setErrors({ load: 'Failed to load task data' });
    } finally {
      setLoadingData(false);
    }
  };

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
    
    // Add comment if provided
    if (formData.comments.trim()) {
      changes.comment = formData.comments;
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
    if (Object.keys(changes).length === 0 && !formData.comments.trim()) {
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
        comments: ''
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
            {task.parent && (
              <div className="text-sm text-blue-700 mt-1">
                This is a subtask. Parent task will not be changed.
              </div>
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
              disabled={loading}
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
                disabled={loading}
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
                    disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>
          </div>

          {/* Developer */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Developer
            </label>
            <input
              type="text"
              value={formData.developer}
              onChange={(e) => handleInputChange('developer', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors"
              placeholder="Enter developer name..."
              disabled={loading}
            />
          </div>

          {/* Update Comments */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Update Comments
            </label>
            <textarea
              value={formData.comments}
              onChange={(e) => handleInputChange('comments', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors resize-none"
              placeholder="Add comments about this update..."
              disabled={loading}
            />
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