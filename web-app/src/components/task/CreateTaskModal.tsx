'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Flag, MessageSquare, Plus, FolderTree } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
  comments: string;
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
    comments: ''
  });

  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [developerOptions, setDeveloperOptions] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Priority options
  const priorities = [
    { id: 1, name: 'Urgent', color: '#f87171' },
    { id: 2, name: 'High', color: '#fb923c' },
    { id: 3, name: 'Normal', color: '#60a5fa' },
    { id: 4, name: 'Low', color: '#a3a3a3' }
  ];

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  const loadFormData = async () => {
    try {
      // Fetch developer options from the API
      const response = await fetch('/api/tasks/developers');
      if (response.ok) {
        const data = await response.json();
        setDeveloperOptions(data.developers || []);
      }

      // For now, we'll use hardcoded statuses and let the server handle the ClickUp API calls
      // In a production app, you'd create API endpoints for these as well
      const defaultStatuses = [
        { id: '1', status: 'to do' },
        { id: '2', status: 'in progress' },
        { id: '3', status: 'review' },
        { id: '4', status: 'done' }
      ];

      setStatuses(defaultStatuses);
      
      // Set default status
      if (defaultStatuses.length > 0) {
        setFormData(prev => ({ ...prev, status: defaultStatuses[0].status }));
      }
    } catch (error) {
      console.error('Error loading form data:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare task data
      const taskData: any = {
        name: formData.name,
        description: formData.description || undefined,
        status: formData.status,
        priority: formData.priority || undefined,
        due_date: formData.dueDate ? new Date(formData.dueDate).getTime() : undefined,
        time_estimate: formData.timeEstimate ? parseInt(formData.timeEstimate) * 60 * 60 * 1000 : undefined, // Convert hours to milliseconds
        developer: formData.developer || undefined, // Let the server handle custom field mapping
      };

      // Add comment to description if provided
      if (formData.comments.trim()) {
        taskData.description = `${taskData.description || ''}\n\nInitial Comment: ${formData.comments}`.trim();
      }

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
        comments: ''
      });

      // Notify parent component
      onTaskCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating subtask:', error);
      setErrors({ submit: error.message || 'Failed to create subtask' });
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
      title="Create New Review Item"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 text-blue-800">
            <FolderTree className="w-5 h-5" />
            <span className="font-medium">Creating Review Item</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            This item will be created as a subtask under the "Review" parent task for organized tracking.
          </p>
        </div>

        {/* Task Name */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Review Item Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={cn(
              "w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors",
              errors.name ? "border-[var(--color-error-500)]" : "border-[var(--color-border)]"
            )}
            placeholder="Enter review item name..."
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

        {/* Comments */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            <MessageSquare className="w-4 h-4 inline mr-1" />
            Initial Comments
          </label>
          <textarea
            value={formData.comments}
            onChange={(e) => handleInputChange('comments', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors resize-none"
            placeholder="Add any initial comments or notes..."
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
            <Plus className="w-4 h-4 mr-1" />
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;