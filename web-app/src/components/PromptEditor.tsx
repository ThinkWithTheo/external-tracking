'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function PromptEditor() {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current prompt
  useEffect(() => {
    fetchPrompt();
  }, []);

  const fetchPrompt = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/llm-prompt', { cache: 'no-store' });
      
      if (response.ok) {
        const data = await response.json();
        setContent(data.prompt || '');
        setOriginalContent(data.prompt || '');
      } else if (response.status === 404) {
        // If no prompt is set, the user can create one.
        setContent('');
        setOriginalContent('');
      } else {
        setMessage({ type: 'error', text: 'Failed to load prompt' });
      }
    } catch (error) {
      console.error('Error fetching prompt:', error);
      setMessage({ type: 'error', text: 'Error loading prompt' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch('/api/llm-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: content }),
      });

      if (response.ok) {
        setOriginalContent(content);
        setMessage({ type: 'success', text: 'Prompt saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to save prompt' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error saving prompt' });
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
        <div className="text-gray-500 dark:text-gray-400">Loading prompt...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">LLM Analysis Prompt</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Edit the prompt used for daily analysis. Lines: {lineCount}
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
              {saving ? 'Saving...' : 'Save Prompt'}
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
            placeholder="Enter your LLM prompt here..."
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
      </Card>
    </div>
  );
}