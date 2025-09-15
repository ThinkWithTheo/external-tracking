'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Clock, Calendar, MessageCircle, User, Flag, MoreHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { cn, formatTimeEstimate, formatDueDate } from '@/lib/utils';
import { ProcessedTask } from '@/types/clickup';

interface TaskCardProps {
  task: ProcessedTask;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
  style?: React.CSSProperties;
  hideSubtasks?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isExpanded = false,
  onToggleExpand,
  className,
  style,
  hideSubtasks = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks.filter(subtask => 
    subtask.status.toLowerCase().includes('done') || 
    subtask.status.toLowerCase().includes('complete')
  ).length;
  const subtaskProgress = hasSubtasks ? (completedSubtasks / task.subtasks.length) * 100 : 0;

  const getPriorityIcon = (priority?: { name: string; color: string }) => {
    if (!priority) return null;
    
    const priorityName = priority.name.toLowerCase();
    if (priorityName === 'urgent' || priorityName === 'high') {
      return <Flag className="h-3 w-3" />;
    }
    return null;
  };

  const isOverdue = task.dueDate && new Date(parseInt(task.dueDate)) < new Date() && 
    !task.status.toLowerCase().includes('done');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ scale: 0.98 }}
      layout
      style={style}
      className={cn("h-full", className)}
    >
      <Card
        className={cn(
          "transition-all duration-200 hover:shadow-lg h-full",
          hasSubtasks && onToggleExpand && !task.isSubtask && "cursor-pointer",
          isOverdue && "border-l-4 border-l-[var(--color-error-500)]",
          task.priority?.name.toLowerCase() === 'urgent' && "border-l-4 border-l-[var(--color-error-500)] animate-pulse-priority"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={hasSubtasks && onToggleExpand && !task.isSubtask ? (e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleExpand();
        } : task.isSubtask ? (e) => {
          // Prevent subtask clicks from bubbling up to parent
          e.preventDefault();
          e.stopPropagation();
        } : undefined}
      >
      <div className="p-4 space-y-4 flex flex-col h-full">
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Expand/Collapse Indicator - Visual only, no button */}
            {hasSubtasks && onToggleExpand && !task.isSubtask && (
              <div className="h-6 w-6 mt-0.5 flex-shrink-0 flex items-center justify-center text-[var(--color-text-muted)]">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            )}

            {/* Priority Indicator & Task Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start space-x-2">
                {task.priority && (
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                      task.priority.name.toLowerCase() === 'urgent' && "animate-pulse-priority"
                    )}
                    style={{ backgroundColor: task.priority.color }}
                    title={`Priority: ${task.priority.name}`}
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-medium text-[var(--color-text-primary)] leading-tight",
                    task.isSubtask ? "text-sm" : "text-base"
                  )}>
                    {task.name}
                  </h3>
                  
                  {/* Task ID */}
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    #{task.id}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 opacity-0 transition-opacity",
              isHovered && "opacity-100"
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {/* Status Badge */}
          <StatusBadge status={task.status} color={task.statusColor} />

          {/* Priority Badge - Always show, even if no priority */}
          <PriorityBadge
            priority={task.priority?.name || 'None'}
            color={task.priority?.color}
          />

          {/* Time Estimate */}
          {task.timeEstimate && (
            <div className="flex items-center space-x-1 text-[var(--color-text-secondary)]">
              <Clock className="h-3 w-3" />
              <span className="text-xs">{formatTimeEstimate(task.timeEstimate)}</span>
            </div>
          )}

          {/* Due Date */}
          {task.dueDate && (
            <div className={cn(
              "flex items-center space-x-1 text-xs",
              isOverdue ? "text-[var(--color-error-600)]" : "text-[var(--color-text-secondary)]"
            )}>
              <Calendar className="h-3 w-3" />
              <span>{formatDueDate(task.dueDate)}</span>
            </div>
          )}

          {/* Comments */}
          {task.comments.length > 0 && (
            <div className="flex items-center space-x-1 text-[var(--color-text-secondary)]">
              <MessageCircle className="h-3 w-3" />
              <span className="text-xs">{task.comments.length}</span>
            </div>
          )}
        </div>

        {/* Developer & Progress Row - Push to bottom */}
        <div className="flex items-center justify-between mt-auto">
          {/* Developer */}
          <div className="flex items-center space-x-2">
            {task.developer ? (
              <>
                <Avatar
                  name={task.developer}
                  size="sm"
                  className="h-6 w-6"
                  style={task.developerColor ? { backgroundColor: task.developerColor } : undefined}
                />
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {task.developer}
                </span>
              </>
            ) : (
              <div className="flex items-center space-x-2 text-[var(--color-text-muted)]">
                <User className="h-4 w-4" />
                <span className="text-sm">Unassigned</span>
              </div>
            )}
          </div>

          {/* Subtask Progress */}
          {hasSubtasks && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-[var(--color-text-muted)]">
                {completedSubtasks}/{task.subtasks.length}
              </span>
              <div className="w-16">
                <Progress
                  value={subtaskProgress}
                  size="sm"
                  variant={subtaskProgress === 100 ? "success" : "default"}
                />
              </div>
            </div>
          )}
        </div>

        {/* Subtasks - only show if not hidden */}
        <AnimatePresence>
          {hasSubtasks && isExpanded && !hideSubtasks && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="border-t border-[var(--color-border-light)] pt-4 space-y-2 overflow-hidden"
            >
              <motion.h4
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-sm font-medium text-[var(--color-text-secondary)] mb-3"
              >
                Subtasks ({task.subtasks.length})
              </motion.h4>
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.1,
                    },
                  },
                }}
                className={cn(
                  "grid gap-3",
                  "grid-cols-1",
                  "sm:grid-cols-2",
                  "lg:grid-cols-3",
                  "xl:grid-cols-4",
                  "auto-rows-fr"
                )}
              >
                {task.subtasks.map((subtask, index) => (
                  <motion.div
                    key={subtask.id}
                    variants={{
                      hidden: { opacity: 0, scale: 0.9 },
                      visible: {
                        opacity: 1,
                        scale: 1,
                        transition: {
                          duration: 0.3,
                          ease: "easeOut",
                        },
                      },
                    }}
                  >
                    <TaskCard
                      task={subtask}
                      className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow h-full"
                    />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
    </motion.div>
  );
};

// Task Grid Component for card layout
interface TaskGridProps {
  tasks: ProcessedTask[];
  expandedTasks: Set<string>;
  onToggleExpand: (taskId: string) => void;
  className?: string;
}

const TaskGrid: React.FC<TaskGridProps> = ({
  tasks,
  expandedTasks,
  onToggleExpand,
  className
}) => {
  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <div className="text-[var(--color-text-muted)] space-y-2">
          <p className="text-lg">No tasks found</p>
          <p className="text-sm">All tasks may be closed or there might be no tasks in this list</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className={cn("space-y-6", className)}
    >
      {tasks.map((task, index) => (
        <motion.div
          key={task.id}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: 0.4,
                ease: [0.4, 0.0, 0.2, 1],
              },
            },
          }}
        >
          {/* Parent Task - Full Width with Subtasks Inside */}
          <TaskCard
            task={task}
            isExpanded={expandedTasks.has(task.id)}
            onToggleExpand={() => onToggleExpand(task.id)}
            className="w-full"
            hideSubtasks={false}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export { TaskCard, TaskGrid };
export default TaskCard;