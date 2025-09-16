'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, FileText, User, Shield, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastRefresh?: Date | null;
  className?: string;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing = false,
  lastRefresh,
  className,
  onLogout
}) => {
  const [username, setUsername] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    // Check localStorage for user info
    const storedUser = localStorage.getItem('trackingUser');
    const storedAdmin = localStorage.getItem('trackingAdmin');
    
    if (storedUser) {
      setUsername(storedUser === 'sdf65e4wf6ae4rew3' ? 'Admin' : storedUser);
      setIsAdmin(storedAdmin === 'true');
    }
  }, []);

  const handleViewLog = () => {
    // Open the markdown log in a new tab
    window.open('/api/logs/markdown', '_blank');
  };

  const handleDownloadLLMReport = () => {
    // Download the LLM report
    window.open('/api/llm-report?download=true', '_blank');
  };
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

          {/* Right Section - User Info and Actions */}
          <div className="flex items-center space-x-3">
            {/* User Info */}
            {username && (
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-lg bg-[var(--color-surface-hover)]">
                {isAdmin ? (
                  <Shield className="h-4 w-4 text-[var(--color-success-500)]" />
                ) : (
                  <User className="h-4 w-4 text-[var(--color-text-secondary)]" />
                )}
                <span className="text-sm text-[var(--color-text-primary)]">
                  {username}
                </span>
                {isAdmin && (
                  <Badge variant="success" size="sm">
                    Full Access
                  </Badge>
                )}
              </div>
            )}

            {/* Admin buttons */}
            {isAdmin && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleViewLog}
                  aria-label="View change log"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Log
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadLLMReport}
                  aria-label="Download LLM Report"
                  title="Download task report for LLM analysis"
                >
                  <Download className="h-4 w-4 mr-2" />
                  LLM Report
                </Button>
              </>
            )}

            {/* Logout Button */}
            {username && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;