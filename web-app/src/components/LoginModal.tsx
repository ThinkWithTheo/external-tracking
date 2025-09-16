'use client';

import React, { useState, useEffect } from 'react';
import { User, Lock, LogIn } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (username: string, isAdmin: boolean) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLogin }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter your name or access code');
      return;
    }

    // Check if it's the admin code
    const isAdmin = username.trim() === 'sdf65e4wf6ae4rew3';
    
    // Store in localStorage
    localStorage.setItem('trackingUser', username);
    localStorage.setItem('trackingAdmin', isAdmin.toString());
    
    // Call the onLogin callback
    onLogin(username, isAdmin);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Can't close without logging in
      title="Welcome to Task Tracker"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            Enter your name to view tasks, or use an access code for editing privileges.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Name or Access Code
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError('');
            }}
            className={cn(
              "w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] transition-colors",
              error ? "border-[var(--color-error-500)]" : "border-[var(--color-border)]"
            )}
            placeholder="Enter your name..."
            autoFocus
          />
          {error && (
            <p className="mt-1 text-sm text-[var(--color-error-500)]">{error}</p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Lock className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Access Levels:</p>
              <ul className="space-y-1">
                <li>• <strong>Name:</strong> View-only access to all tasks</li>
                <li>• <strong>Access Code:</strong> Full editing privileges</li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Continue
        </Button>
      </form>
    </Modal>
  );
};

export default LoginModal;