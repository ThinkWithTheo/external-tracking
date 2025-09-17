'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function LogEditor() {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current logs
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Force no cache on fetch
      const response = await fetch('/api/logs/markdown', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      });
      if (response.ok) {
        // Check if response is JSON or plain text
        const contentType = response.headers.get('content-type');
        let logContent = '';
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          logContent = data.content || '';
        } else {
          // Handle plain text response
          logContent = await response.text();
        }
        
        setContent(logContent);
        setOriginalContent(logContent);
      } else {
        setMessage({ type: 'error', text: 'Failed to load logs' });
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setMessage({ type: 'error', text: 'Error loading logs' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch('/api/logs/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        setOriginalContent(content);
        setMessage({ type: 'success', text: 'Logs saved successfully!' });
        // Clear success message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save logs' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving logs' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setContent(originalContent);
    setMessage(null);
  };

  const hasChanges = content !== originalContent;
  const lineCount = content.split('\n').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">Loading logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Task Change Logs</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Edit the task change logs directly. Lines: {lineCount}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleReset}
              variant="secondary"
              disabled={!hasChanges || saving}
            >
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-md text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[500px] p-4 font-mono text-sm border rounded-md 
                     bg-white dark:bg-gray-900 
                     border-gray-200 dark:border-gray-700
                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                     resize-y"
            placeholder="No logs available yet..."
            spellCheck={false}
          />
          {hasChanges && (
            <div className="absolute top-2 right-2">
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 rounded">
                Unsaved changes
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div>
            Tip: Use Ctrl+A to select all, Ctrl+Z to undo
          </div>
          <div>
            {hasChanges ? `${Math.abs(content.length - originalContent.length)} characters changed` : 'No changes'}
          </div>
        </div>
      </Card>
    </div>
  );
}