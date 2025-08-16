'use client';

import React from 'react';
import { RefreshCw, Search, Filter, Settings, Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastRefresh?: Date | null;
  onCreateTask?: () => void;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing = false,
  lastRefresh,
  onCreateTask,
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

          {/* Center Section - Search (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-4 py-2 text-sm placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)] transition-colors"
              />
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-2">
            {/* Last Refresh Indicator */}
            {lastRefresh && (
              <div className="hidden sm:flex items-center text-xs text-[var(--color-text-muted)] mr-2">
                <span>Updated: {lastRefresh.toLocaleTimeString()}</span>
              </div>
            )}

            {/* Create New Review Item Button */}
            <Button
              variant="primary"
              size="default"
              onClick={onCreateTask}
              className="hidden sm:flex"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Review Item
            </Button>

            {/* Mobile Create Review Item Button */}
            <Button
              variant="primary"
              size="icon"
              onClick={onCreateTask}
              className="sm:hidden"
              aria-label="Create new review item"
            >
              <Plus className="h-4 w-4" />
            </Button>

            {/* Mobile Search Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>

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
              <Badge
                variant="error"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
              >
                3
              </Badge>
            </Button>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh tasks"
              className="relative"
            >
              <RefreshCw className={cn(
                "h-4 w-4 transition-transform",
                isRefreshing && "animate-spin"
              )} />
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

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-4 py-2 text-sm placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)] transition-colors"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;