'use client';

import React from 'react';
import { RefreshCw, Filter, Settings, Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastRefresh?: Date | null;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing = false,
  lastRefresh,
  className
}) => {
  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-surface)] to-[var(--color-surface-hover)] backdrop-blur-sm",
      className
    )}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left Section - Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {/* Logo/Icon */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-secondary-500)] text-white font-bold text-sm">
                ET
              </div>
              
              {/* Title */}
              <div>
                <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  External Tracking
                </h1>
                <p className="text-xs text-[var(--color-text-secondary)] hidden sm:block">
                  Task Management System
                </p>
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-2">
            {/* Filter Button */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Filter tasks"
            >
              <Filter className="h-4 w-4" />
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {/* TODO: Add dynamic notification badge - see UI-IMPROVEMENT-PLAN.md */}
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Connection Status */}
            <div className="hidden sm:flex items-center space-x-2 ml-4 pl-4 border-l border-[var(--color-border)]">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-[var(--color-success-500)] animate-pulse" />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Connected
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;