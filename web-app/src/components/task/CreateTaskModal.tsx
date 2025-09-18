'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, User, Flag, Plus, FolderTree } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

interface TaskFormData {
  name: string;
  description: string;
  status: string;
  priority: number | null;
  dueDate: string;
  timeEstimate: string;
  developer: string;
  parentTask?: string;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated
}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    description: '',
    status: '',
    priority: null,
    dueDate: '',
    timeEstimate: '',
    developer: '',
    parentTask: ''
  });

  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<Array<{ id: string; status: string; color: string }>>([]);
  const [developerOptions, setDeveloperOptions] = useState<Array<{ id: string | number; name: string; color?: string }>>([]);
  const [parentTasks, setParentTasks] = useState<Array<{ id: string; name: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreationAllowed, setIsCreationAllowed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState<string>('');

  // Check if user has admin privileges for task creation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminStatus = localStorage.getItem('trackingAdmin') === 'true';
      const storedUsername = localStorage.getItem('trackingUser') || '';
      setIsAdmin(adminStatus);
      setUsername(storedUsername);
      // All users can create tasks now, but with different permissions
      setIsCreationAllowed(true);
    }
  }, [isOpen]); // Re-check when modal opens

  // Priority options
  const priorities = [
    { id: 1, name: 'Urgent', color: '#f87171' },
    { id: 2, name: 'High', color: '#fb923c' },
    { id: 3, name: 'Normal', color: '#60a5fa' },
    { id: 4, name: 'Low', color: '#a3a3a3' }
  ];

  // Load form data function
  const loadFormData = useCallback(async () => {
    try {
      // Fetch developer options from the API
      const response = await fetch('/api/tasks/developers');
      if (response.ok) {
        const data = await response.json();
        const sortedDevelopers = (data.developers || []).sort((a: { name: string; }, b: { name: string; }) => a.name.localeCompare(b.name));
        setDeveloperOptions(sortedDevelopers);
      }

      // Fetch parent tasks if admin
      if (isAdmin) {
        const tasksResponse = await fetch('/api/tasks');
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          // Filter for parent tasks only (tasks without a parent)
          interface TaskItem {
            id: string;
            name: string;
            parent?: string;
          }
          const parents = tasksData.tasks
            .filter((task: TaskItem) => !task.parent)
            .map((task: TaskItem) => ({ id: task.id, name: task.name }))
            .sort((a: { name: string; }, b: { name: string; }) => a.name.localeCompare(b.name));
          setParentTasks(parents);
        }
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
      
      // Set default status
      if (defaultStatuses.length > 0) {
        setFormData(prev => ({ ...prev, status: defaultStatuses[0].status }));
      }
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  }, [isAdmin]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen, loadFormData]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare task data
      interface TaskDataPayload {
        name: string;
        description?: string;
        status: string;
        priority?: number | null;
        due_date?: number;
        time_estimate?: number;
        developer?: string;
        isAdmin: boolean;
        parentTask?: string;
        username?: string;
      }
      
      const taskData: TaskDataPayload = {
        name: formData.name,
        description: formData.description || undefined,
        status: formData.status,
        priority: formData.priority || undefined,
        due_date: formData.dueDate ? new Date(formData.dueDate).getTime() : undefined,
        time_estimate: formData.timeEstimate ? parseInt(formData.timeEstimate) * 60 * 60 * 1000 : undefined, // Convert hours to milliseconds
        developer: formData.developer || undefined, // Let the server handle custom field mapping
        isAdmin: isAdmin,
        parentTask: isAdmin ? formData.parentTask : undefined, // Only send parent task if admin
        username: username || undefined, // Send the username
      };

      // Create the task via API
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create task');
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        status: statuses[0]?.status || '',
        priority: null,
        dueDate: '',
        timeEstimate: '',
        developer: '',
        parentTask: ''
      });

      // Notify parent component
      onTaskCreated();
      onClose();
    } catch (error: unknown) {
      console.error('Error creating subtask:', error);
      const submitError = error as { message?: string };
      setErrors({ submit: submitError.message || 'Failed to create subtask' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isAdmin ? "Create New Review Item" : "Create New Item"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 text-blue-800">
            <FolderTree className="w-5 h-5" />
            <span className="font-medium">{isAdmin ? "Creating Review Item" : "Creating New Item"}</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            {isAdmin
              ? "This item will be created as a subtask under your selected parent task."
              : "This item will be created as a subtask under the \"New\" parent task for organized tracking."
            }
          </p>
        </div>

        {/* Parent Task Selection (Admin Only) */}
        {isAdmin && (
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Parent Task
            </label>
            <select
              value={formData.parentTask}
              onChange={(e) => handleInputChange('parentTask', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors"
              disabled={loading}
            >
              <option value="">Select parent task...</option>
              {parentTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Task Name */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            {isAdmin ? "Review Item Name *" : "Item Name *"}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={cn(
              "w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors",
              errors.name ? "border-[var(--color-error-500)]" : "border-[var(--color-border)]"
            )}
            placeholder={isAdmin ? "Enter review item name..." : "Enter item name..."}
            disabled={loading || !isCreationAllowed}
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
            disabled={loading || !isCreationAllowed}
          />
        </div>

        {/* Admin-only fields */}
        {isAdmin && (
          <>
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
              disabled={loading || !isCreationAllowed}
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
                  onClick={() => handleInputChange('priority', priority.id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all",
                    formData.priority === priority.id
                      ? "ring-2 ring-offset-2 ring-[var(--color-primary-500)]"
                      : "hover:scale-105"
                  )}
                  style={{
                    backgroundColor: priority.color,
                    color: 'white'
                  }}
                  disabled={loading || !isCreationAllowed}
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
              disabled={loading || !isCreationAllowed}
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
              disabled={loading || !isCreationAllowed}
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
            disabled={loading || !isCreationAllowed}
          >
            <option value="">Select developer...</option>
            {developerOptions.map((dev) => (
              <option key={dev.id} value={dev.name}>
                {dev.name}
              </option>
                ))}
              </select>
            </div>
          </>
        )}

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
            disabled={loading || !isCreationAllowed}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;