'use client';

import React from 'react';
import { CheckCircle, Clock, AlertCircle, Users, TrendingUp, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { cn } from '@/lib/utils';
import { ProcessedTask } from '@/types/clickup';

interface StatsBarProps {
  tasks: ProcessedTask[];
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
        return 'border-[var(--color-success-200)] bg-gradient-to-br from-[var(--color-success-50)] to-[var(--color-surface)]';
      case 'warning':
        return 'border-[var(--color-warning-200)] bg-gradient-to-br from-[var(--color-warning-50)] to-[var(--color-surface)]';
      case 'error':
        return 'border-[var(--color-error-200)] bg-gradient-to-br from-[var(--color-error-50)] to-[var(--color-surface)]';
      default:
        return 'border-[var(--color-primary-200)] bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-surface)]';
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
            "flex h-10 w-10 items-center justify-center rounded-lg bg-white/50",
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

const StatsBar: React.FC<StatsBarProps> = ({ tasks, className }) => {
  // Calculate statistics
  const totalTasks = tasks.length;
  const totalSubtasks = tasks.reduce((acc, task) => acc + task.subtasks.length, 0);
  
  const completedTasks = tasks.filter(task => 
    task.status.toLowerCase().includes('done') || 
    task.status.toLowerCase().includes('complete') ||
    task.status.toLowerCase().includes('closed')
  ).length;
  
  const inProgressTasks = tasks.filter(task => 
    task.status.toLowerCase().includes('progress') ||
    task.status.toLowerCase().includes('active') ||
    task.status.toLowerCase().includes('working')
  ).length;
  
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(parseInt(task.dueDate));
    return dueDate < new Date() && !task.status.toLowerCase().includes('done');
  }).length;
  
  const highPriorityTasks = tasks.filter(task => 
    task.priority?.name.toLowerCase() === 'high' || 
    task.priority?.name.toLowerCase() === 'urgent'
  ).length;
  
  const assignedDevelopers = new Set(
    tasks.map(task => task.developer).filter(Boolean)
  ).size;
  
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  // Calculate estimated total time
  const totalEstimatedTime = tasks.reduce((acc, task) => {
    const taskTime = task.timeEstimate || 0;
    const subtaskTime = task.subtasks.reduce((subAcc, subtask) => 
      subAcc + (subtask.timeEstimate || 0), 0
    );
    return acc + taskTime + subtaskTime;
  }, 0);
  
  const formatTime = (timeInMs: number): string => {
    const hours = Math.floor(timeInMs / (1000 * 60 * 60));
    return `${hours}h`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Tasks"
          value={totalTasks}
          subtitle={`${totalSubtasks} subtasks`}
          icon={<CheckCircle className="h-5 w-5" />}
          variant="default"
        />
        
        <StatCard
          title="In Progress"
          value={inProgressTasks}
          subtitle={`${Math.round((inProgressTasks / totalTasks) * 100)}% of total`}
          icon={<Clock className="h-5 w-5" />}
          variant="warning"
        />
        
        <StatCard
          title="Completed"
          value={completedTasks}
          subtitle={`${Math.round(completionRate)}% done`}
          icon={<CheckCircle className="h-5 w-5" />}
          variant="success"
        />
        
        <StatCard
          title="Overdue"
          value={overdueTasks}
          subtitle={overdueTasks > 0 ? "Need attention" : "All on track"}
          icon={<AlertCircle className="h-5 w-5" />}
          variant={overdueTasks > 0 ? "error" : "success"}
        />
        
        <StatCard
          title="High Priority"
          value={highPriorityTasks}
          subtitle={`${Math.round((highPriorityTasks / totalTasks) * 100)}% urgent`}
          icon={<AlertCircle className="h-5 w-5" />}
          variant={highPriorityTasks > 0 ? "error" : "default"}
        />
        
        <StatCard
          title="Developers"
          value={assignedDevelopers}
          subtitle={totalEstimatedTime > 0 ? formatTime(totalEstimatedTime) : "No estimates"}
          icon={<Users className="h-5 w-5" />}
          variant="default"
        />
      </div>
      
      {/* Progress Overview */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
              Project Progress
            </h3>
            <Badge variant="outline" className="text-xs">
              {Math.round(completionRate)}% Complete
            </Badge>
          </div>
          
          <Progress
            value={completionRate}
            variant="gradient"
            showLabel
            label="Overall Completion"
            className="w-full"
          />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold text-[var(--color-success-600)]">
                {completedTasks}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">Completed</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-warning-600)]">
                {inProgressTasks}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">In Progress</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-text-secondary)]">
                {totalTasks - completedTasks - inProgressTasks}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">To Do</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StatsBar;