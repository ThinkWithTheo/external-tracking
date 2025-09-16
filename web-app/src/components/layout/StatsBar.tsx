'use client';

import React, { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, Users, TrendingUp, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { cn } from '@/lib/utils';
import { ProcessedTask } from '@/types/clickup';

interface StatsBarProps {
  tasks: ProcessedTask[];
  onTaskClick?: (taskId: string) => void;
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  trend
}) => {
  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'border-[var(--color-success-200)] bg-gradient-to-br from-[var(--color-success-50)] to-[var(--color-surface)] dark:bg-[var(--color-surface)] dark:border-[var(--color-success-700)]';
      case 'warning':
        return 'border-[var(--color-warning-200)] bg-gradient-to-br from-[var(--color-warning-50)] to-[var(--color-surface)] dark:bg-[var(--color-surface)] dark:border-[var(--color-warning-700)]';
      case 'error':
        return 'border-[var(--color-error-200)] bg-gradient-to-br from-[var(--color-error-50)] to-[var(--color-surface)] dark:bg-[var(--color-surface)] dark:border-[var(--color-error-700)]';
      default:
        return 'border-[var(--color-primary-200)] bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-surface)] dark:bg-[var(--color-surface)] dark:border-[var(--color-primary-700)]';
    }
  };

  const getIconColor = (variant: string) => {
    switch (variant) {
      case 'success': return 'text-[var(--color-success-600)]';
      case 'warning': return 'text-[var(--color-warning-600)]';
      case 'error': return 'text-[var(--color-error-600)]';
      default: return 'text-[var(--color-primary-600)]';
    }
  };

  return (
    <Card className={cn(
      "p-4 transition-all duration-200 hover:shadow-md",
      getVariantStyles(variant)
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg bg-white/50 dark:bg-[var(--color-surface-hover)]",
            getIconColor(variant)
          )}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              {title}
            </p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-[var(--color-text-muted)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {trend && (
          <div className={cn(
            "flex items-center space-x-1 text-xs font-medium",
            trend.isPositive ? "text-[var(--color-success-600)]" : "text-[var(--color-error-600)]"
          )}>
            <TrendingUp className={cn(
              "h-3 w-3",
              !trend.isPositive && "rotate-180"
            )} />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </Card>
  );
};

const StatsBar: React.FC<StatsBarProps> = ({ tasks, onTaskClick, className }) => {
  // State for collapsible sections
  const [isUrgentCollapsed, setIsUrgentCollapsed] = useState(true);
  const [isHighCollapsed, setIsHighCollapsed] = useState(true);
  
  // Calculate statistics based on subtasks (parent tasks are just for grouping)
  const totalSubtasks = tasks.reduce((acc, task) => acc + task.subtasks.length, 0);
  
  // Count in-progress subtasks and calculate their hours
  let inProgressSubtasks = 0;
  let inProgressHours = 0;
  tasks.forEach(task => {
    task.subtasks?.forEach(subtask => {
      if (subtask.status.toLowerCase().includes('progress') ||
          subtask.status.toLowerCase().includes('active') ||
          subtask.status.toLowerCase().includes('working')) {
        inProgressSubtasks++;
        inProgressHours += (subtask.timeEstimate || 0) / (1000 * 60 * 60);
      }
    });
  });
  
  // Count unique developers from subtasks only
  const allDevelopers = new Set<string>();
  tasks.forEach(task => {
    task.subtasks?.forEach(subtask => {
      const developer = subtask.developer || task.developer;
      if (developer) {
        allDevelopers.add(developer);
      }
    });
  });
  const assignedDevelopers = allDevelopers.size;
  
  // Calculate estimated total time from subtasks only
  const totalEstimatedTime = tasks.reduce((acc, task) => {
    const subtaskTime = task.subtasks.reduce((subAcc, subtask) =>
      subAcc + (subtask.timeEstimate || 0), 0
    );
    return acc + subtaskTime;
  }, 0);
  
  // Calculate total hours and weeks
  const totalHours = totalEstimatedTime / (1000 * 60 * 60);
  const totalWeeks = assignedDevelopers > 0 ? (totalHours / 6 / 5 / assignedDevelopers) : 0;
  
  const formatTime = (timeInMs: number): string => {
    const hours = Math.floor(timeInMs / (1000 * 60 * 60));
    return `${hours}h`;
  };
  
  const formatWeeks = (weeks: number): string => {
    if (weeks < 1) {
      const days = Math.ceil(weeks * 5);
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
    return `${weeks.toFixed(1)} week${weeks !== 1 ? 's' : ''}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Stats Grid - Focused on subtasks and work metrics */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Active Tasks"
          value={totalSubtasks}
          subtitle={`Total work items`}
          icon={<CheckCircle className="h-5 w-5" />}
          variant="default"
        />
        
        <StatCard
          title="In Progress"
          value={inProgressSubtasks}
          subtitle={inProgressHours > 0 ? `${inProgressHours.toFixed(1)}h total` : "No hours estimated"}
          icon={<Clock className="h-5 w-5" />}
          variant="warning"
        />
        
        <StatCard
          title="Developers"
          value={assignedDevelopers}
          subtitle={totalHours > 0 ? `${totalHours.toFixed(0)}h / ${formatWeeks(totalWeeks)}` : "No estimates"}
          icon={<Users className="h-5 w-5" />}
          variant="default"
        />
      </div>
      
      {/* In Progress Tasks by Developer */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
              In Progress Tasks by Developer
            </h3>
            <Badge variant="warning" className="text-xs">
              {inProgressSubtasks} In Progress
            </Badge>
          </div>
          
          {(() => {
            // Collect all in-progress subtasks with their parent task names
            const inProgressSubtasksList: Array<{
              subtask: ProcessedTask;
              parentName: string;
              developer: string;
              developerColor: string;
            }> = [];
            
            // Check each task's subtasks for in-progress status
            tasks.forEach(task => {
              if (task.subtasks && task.subtasks.length > 0) {
                task.subtasks.forEach(subtask => {
                  // Check if the subtask itself is in progress
                  const isSubtaskInProgress = subtask.status.toLowerCase().includes('progress') ||
                                             subtask.status.toLowerCase().includes('active') ||
                                             subtask.status.toLowerCase().includes('working');
                  
                  if (isSubtaskInProgress) {
                    inProgressSubtasksList.push({
                      subtask,
                      parentName: task.name,
                      developer: subtask.developer || task.developer || 'Unassigned',
                      developerColor: subtask.developerColor || task.developerColor || '#6B7280'
                    });
                  }
                });
              }
            });
            
            // Group subtasks by developer
            const subtasksByDeveloper = inProgressSubtasksList.reduce((acc, item) => {
              const developer = item.developer;
              if (!acc[developer]) {
                acc[developer] = {
                  subtasks: [],
                  totalHours: 0,
                  color: item.developerColor
                };
              }
              acc[developer].subtasks.push(item);
              
              // Add subtask hours
              const subtaskHours = (item.subtask.timeEstimate || 0) / (1000 * 60 * 60);
              acc[developer].totalHours += subtaskHours;
              
              return acc;
            }, {} as Record<string, { subtasks: typeof inProgressSubtasksList, totalHours: number, color: string }>);
            
            const developers = Object.entries(subtasksByDeveloper).sort((a, b) =>
              b[1].totalHours - a[1].totalHours
            );
            
            if (developers.length === 0) {
              return (
                <div className="text-center py-8 text-[var(--color-text-muted)]">
                  No in-progress subtasks found
                </div>
              );
            }
            
            return (
              <div className="space-y-3">
                {developers.map(([developer, data]) => (
                  <div key={developer} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: data.color }}
                        />
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {developer}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {data.subtasks.length} {data.subtasks.length === 1 ? 'subtask' : 'subtasks'}
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold text-[var(--color-warning-600)]">
                        {data.totalHours > 0 ? `${data.totalHours.toFixed(1)}h` : 'No estimate'}
                      </span>
                    </div>
                    
                    <div className="pl-4 space-y-1">
                      {data.subtasks.map(item => {
                        const displayHours = (item.subtask.timeEstimate || 0) / (1000 * 60 * 60);
                        
                        return (
                          <div key={item.subtask.id} className="flex items-center justify-between py-1 gap-2">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">•</span>
                              <span
                                className={`text-xs text-[var(--color-text-secondary)] truncate block ${onTaskClick ? 'cursor-pointer hover:text-[var(--color-primary-600)] transition-colors' : ''}`}
                                onClick={onTaskClick ? () => onTaskClick(item.subtask.id) : undefined}
                                title={`${item.parentName} - ${item.subtask.name}`}
                              >
                                {item.parentName} - {item.subtask.name}
                              </span>
                            </div>
                            <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
                              {displayHours > 0
                                ? `${displayHours.toFixed(1)}h`
                                : '-'
                              }
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {/* Summary */}
                <div className="pt-3 mt-3 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      Total In Progress Hours
                    </span>
                    <span className="text-lg font-bold text-[var(--color-warning-600)]">
                      {developers.reduce((sum, [_, data]) => sum + data.totalHours, 0).toFixed(1)}h
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      {/* Urgent Priority Tasks by Developer (excluding In Progress) */}
      <Card className="p-4">
        <div className="space-y-4">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setIsUrgentCollapsed(!isUrgentCollapsed)}
          >
            <div className="flex items-center space-x-2">
              {isUrgentCollapsed ? (
                <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
              )}
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                Urgent Priority Tasks by Developer
              </h3>
            </div>
            <Badge variant="error" className="text-xs">
              Urgent Priority
            </Badge>
          </div>
          
          {!isUrgentCollapsed && (() => {
            // Collect all urgent subtasks (excluding in-progress) with their parent task names
            const urgentSubtasks: Array<{
              subtask: ProcessedTask;
              parentName: string;
              developer: string;
              developerColor: string;
            }> = [];
            
            // Filter subtasks with urgent priority (excluding in-progress subtasks)
            tasks.forEach(task => {
              if (task.subtasks && task.subtasks.length > 0) {
                task.subtasks.forEach(subtask => {
                  // Check if the SUBTASK has urgent priority
                  const isUrgent = subtask.priority?.name.toLowerCase() === 'urgent';
                  
                  // Check if the subtask itself is in progress
                  const isSubtaskInProgress = subtask.status.toLowerCase().includes('progress') ||
                                             subtask.status.toLowerCase().includes('active') ||
                                             subtask.status.toLowerCase().includes('working');
                  
                  if (isUrgent && !isSubtaskInProgress) {
                    urgentSubtasks.push({
                      subtask,
                      parentName: task.name,
                      developer: subtask.developer || task.developer || 'Unassigned',
                      developerColor: subtask.developerColor || task.developerColor || '#6B7280'
                    });
                  }
                });
              }
            });
            
            // Group subtasks by developer
            const subtasksByDeveloper = urgentSubtasks.reduce((acc, item) => {
              const developer = item.developer;
              if (!acc[developer]) {
                acc[developer] = {
                  subtasks: [],
                  totalHours: 0,
                  color: item.developerColor
                };
              }
              acc[developer].subtasks.push(item);
              
              // Add subtask hours
              const subtaskHours = (item.subtask.timeEstimate || 0) / (1000 * 60 * 60);
              acc[developer].totalHours += subtaskHours;
              
              return acc;
            }, {} as Record<string, { subtasks: typeof urgentSubtasks, totalHours: number, color: string }>);
            
            const developers = Object.entries(subtasksByDeveloper).sort((a, b) =>
              b[1].totalHours - a[1].totalHours
            );
            
            if (developers.length === 0) {
              return (
                <div className="text-center py-8 text-[var(--color-text-muted)]">
                  No urgent priority subtasks found (excluding in-progress)
                </div>
              );
            }
            
            return (
              <div className="space-y-3">
                {developers.map(([developer, data]) => (
                  <div key={developer} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: data.color }}
                        />
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {developer}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {data.subtasks.length} {data.subtasks.length === 1 ? 'subtask' : 'subtasks'}
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold text-[var(--color-error-600)]">
                        {data.totalHours > 0 ? `${data.totalHours.toFixed(1)}h` : 'No estimate'}
                      </span>
                    </div>
                    
                    <div className="pl-4 space-y-1">
                      {data.subtasks.map(item => {
                        const displayHours = (item.subtask.timeEstimate || 0) / (1000 * 60 * 60);
                        
                        return (
                          <div key={item.subtask.id} className="flex items-center justify-between py-1 gap-2">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">•</span>
                              <span
                                className={`text-xs text-[var(--color-text-secondary)] truncate block ${onTaskClick ? 'cursor-pointer hover:text-[var(--color-primary-600)] transition-colors' : ''}`}
                                onClick={onTaskClick ? () => onTaskClick(item.subtask.id) : undefined}
                                title={`${item.parentName} - ${item.subtask.name}`}
                              >
                                {item.parentName} - {item.subtask.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {item.subtask.status && (
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    borderColor: item.subtask.statusColor,
                                    color: item.subtask.statusColor
                                  }}
                                >
                                  {item.subtask.status}
                                </Badge>
                              )}
                              <span className="text-xs text-[var(--color-text-muted)]">
                                {displayHours > 0
                                  ? `${displayHours.toFixed(1)}h`
                                  : '-'
                                }
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {/* Summary */}
                <div className="pt-3 mt-3 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      Total Urgent Hours
                    </span>
                    <span className="text-lg font-bold text-[var(--color-error-600)]">
                      {developers.reduce((sum, [_, data]) => sum + data.totalHours, 0).toFixed(1)}h
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      {/* High Priority Tasks by Developer (excluding In Progress) */}
      <Card className="p-4">
        <div className="space-y-4">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setIsHighCollapsed(!isHighCollapsed)}
          >
            <div className="flex items-center space-x-2">
              {isHighCollapsed ? (
                <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
              )}
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                High Priority Tasks by Developer
              </h3>
            </div>
            <Badge variant="warning" className="text-xs">
              High Priority
            </Badge>
          </div>
          
          {!isHighCollapsed && (() => {
            // Collect all high priority subtasks (excluding in-progress) with their parent task names
            const highSubtasks: Array<{
              subtask: ProcessedTask;
              parentName: string;
              developer: string;
              developerColor: string;
            }> = [];
            
            // Filter subtasks with high priority (excluding in-progress subtasks)
            tasks.forEach(task => {
              if (task.subtasks && task.subtasks.length > 0) {
                task.subtasks.forEach(subtask => {
                  // Check if the SUBTASK has high priority
                  const isHigh = subtask.priority?.name.toLowerCase() === 'high';
                  
                  // Check if the subtask itself is in progress
                  const isSubtaskInProgress = subtask.status.toLowerCase().includes('progress') ||
                                             subtask.status.toLowerCase().includes('active') ||
                                             subtask.status.toLowerCase().includes('working');
                  
                  if (isHigh && !isSubtaskInProgress) {
                    highSubtasks.push({
                      subtask,
                      parentName: task.name,
                      developer: subtask.developer || task.developer || 'Unassigned',
                      developerColor: subtask.developerColor || task.developerColor || '#6B7280'
                    });
                  }
                });
              }
            });
            
            // Group subtasks by developer
            const subtasksByDeveloper = highSubtasks.reduce((acc, item) => {
              const developer = item.developer;
              if (!acc[developer]) {
                acc[developer] = {
                  subtasks: [],
                  totalHours: 0,
                  color: item.developerColor
                };
              }
              acc[developer].subtasks.push(item);
              
              // Add subtask hours
              const subtaskHours = (item.subtask.timeEstimate || 0) / (1000 * 60 * 60);
              acc[developer].totalHours += subtaskHours;
              
              return acc;
            }, {} as Record<string, { subtasks: typeof highSubtasks, totalHours: number, color: string }>);
            
            const developers = Object.entries(subtasksByDeveloper).sort((a, b) =>
              b[1].totalHours - a[1].totalHours
            );
            
            if (developers.length === 0) {
              return (
                <div className="text-center py-8 text-[var(--color-text-muted)]">
                  No high priority subtasks found (excluding in-progress)
                </div>
              );
            }
            
            return (
              <div className="space-y-3">
                {developers.map(([developer, data]) => (
                  <div key={developer} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: data.color }}
                        />
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {developer}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {data.subtasks.length} {data.subtasks.length === 1 ? 'subtask' : 'subtasks'}
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold text-[var(--color-warning-600)]">
                        {data.totalHours > 0 ? `${data.totalHours.toFixed(1)}h` : 'No estimate'}
                      </span>
                    </div>
                    
                    <div className="pl-4 space-y-1">
                      {data.subtasks.map(item => {
                        const displayHours = (item.subtask.timeEstimate || 0) / (1000 * 60 * 60);
                        
                        return (
                          <div key={item.subtask.id} className="flex items-center justify-between py-1 gap-2">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">•</span>
                              <span
                                className={`text-xs text-[var(--color-text-secondary)] truncate block ${onTaskClick ? 'cursor-pointer hover:text-[var(--color-primary-600)] transition-colors' : ''}`}
                                onClick={onTaskClick ? () => onTaskClick(item.subtask.id) : undefined}
                                title={`${item.parentName} - ${item.subtask.name}`}
                              >
                                {item.parentName} - {item.subtask.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {item.subtask.status && (
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    borderColor: item.subtask.statusColor,
                                    color: item.subtask.statusColor
                                  }}
                                >
                                  {item.subtask.status}
                                </Badge>
                              )}
                              <span className="text-xs text-[var(--color-text-muted)]">
                                {displayHours > 0
                                  ? `${displayHours.toFixed(1)}h`
                                  : '-'
                                }
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {/* Summary */}
                <div className="pt-3 mt-3 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      Total High Priority Hours
                    </span>
                    <span className="text-lg font-bold text-[var(--color-warning-600)]">
                      {developers.reduce((sum, [_, data]) => sum + data.totalHours, 0).toFixed(1)}h
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </Card>
    </div>
  );
};

export default StatsBar;