'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskList from '@/components/TaskList';
import Header from '@/components/layout/Header';
import StatsBar from '@/components/layout/StatsBar';
import FilterBar, { FilterGroup } from '@/components/layout/FilterBar';
import CreateTaskModal from '@/components/task/CreateTaskModal';
import { PageTransition, FadeIn, SlideIn } from '@/components/animations/PageTransition';
import { ProcessedTask } from '@/types/clickup';

export default function Home() {
  const [tasks, setTasks] = useState<ProcessedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch tasks function
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks');
      const data = await response.json();
      
      if (response.ok) {
        setTasks(data.tasks);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Filter groups configuration
  const filterGroups: FilterGroup[] = [
    {
      id: 'status',
      label: 'Status',
      multiSelect: true,
      options: [
        { id: 'todo', label: 'To Do', value: 'todo', count: tasks.filter(t => t.status.toLowerCase().includes('todo')).length },
        { id: 'progress', label: 'In Progress', value: 'progress', count: tasks.filter(t => t.status.toLowerCase().includes('progress')).length },
        { id: 'review', label: 'In Review', value: 'review', count: tasks.filter(t => t.status.toLowerCase().includes('review')).length },
        { id: 'done', label: 'Done', value: 'done', count: tasks.filter(t => t.status.toLowerCase().includes('done')).length },
      ]
    },
    {
      id: 'priority',
      label: 'Priority',
      multiSelect: true,
      options: [
        { id: 'urgent', label: 'Urgent', value: 'urgent', count: tasks.filter(t => t.priority?.name.toLowerCase() === 'urgent').length },
        { id: 'high', label: 'High', value: 'high', count: tasks.filter(t => t.priority?.name.toLowerCase() === 'high').length },
        { id: 'normal', label: 'Normal', value: 'normal', count: tasks.filter(t => t.priority?.name.toLowerCase() === 'normal').length },
        { id: 'low', label: 'Low', value: 'low', count: tasks.filter(t => t.priority?.name.toLowerCase() === 'low').length },
      ]
    },
    {
      id: 'assignee',
      label: 'Assignee',
      multiSelect: true,
      options: Array.from(new Set(tasks.map(t => t.developer).filter(Boolean))).map(dev => ({
        id: dev!,
        label: dev!,
        value: dev!,
        count: tasks.filter(t => t.developer === dev).length
      }))
    }
  ];

  const handleFilterChange = (groupId: string, values: string[]) => {
    setActiveFilters(prev => ({
      ...prev,
      [groupId]: values
    }));
  };

  const handleClearAllFilters = () => {
    setActiveFilters({});
  };

  const handleCreateTask = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleTaskCreated = () => {
    // Refresh the task list after creating a new task
    fetchTasks();
  };

  // Filter tasks based on active filters
  const filteredTasks = tasks.filter(task => {
    // Status filter
    if (activeFilters.status && activeFilters.status.length > 0) {
      const taskStatus = task.status.toLowerCase();
      const matchesStatus = activeFilters.status.some(status => {
        switch (status) {
          case 'todo':
            return taskStatus.includes('todo') || taskStatus.includes('to do');
          case 'progress':
            return taskStatus.includes('progress') || taskStatus.includes('in progress');
          case 'review':
            return taskStatus.includes('review');
          case 'done':
            return taskStatus.includes('done') || taskStatus.includes('complete');
          default:
            return taskStatus.includes(status);
        }
      });
      if (!matchesStatus) return false;
    }

    // Priority filter
    if (activeFilters.priority && activeFilters.priority.length > 0) {
      if (!task.priority) return false;
      const matchesPriority = activeFilters.priority.includes(task.priority.name.toLowerCase());
      if (!matchesPriority) return false;
    }

    // Assignee filter (using developer field)
    if (activeFilters.assignee && activeFilters.assignee.length > 0) {
      if (!task.developer) return false;
      const matchesAssignee = activeFilters.assignee.includes(task.developer);
      if (!matchesAssignee) return false;
    }

    return true;
  });

  return (
    <PageTransition className="min-h-screen bg-[var(--color-background)]">
      {/* Modern Header */}
      <Header
        onRefresh={fetchTasks}
        isRefreshing={loading}
        lastRefresh={lastRefresh}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Dashboard */}
        <AnimatePresence>
          {!loading && tasks.length > 0 && (
            <SlideIn direction="up" delay={0.1}>
              <StatsBar tasks={tasks} />
            </SlideIn>
          )}
        </AnimatePresence>

        {/* Filter Bar */}
        <AnimatePresence>
          {!loading && tasks.length > 0 && (
            <SlideIn direction="up" delay={0.2}>
              <FilterBar
                filterGroups={filterGroups}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearAllFilters}
              />
            </SlideIn>
          )}
        </AnimatePresence>

        {/* Task List */}
        <SlideIn direction="up" delay={0.3}>
          <motion.div
            className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-sm"
            whileHover={{
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
              transition: { duration: 0.2 }
            }}
          >
            <TaskList
              className="w-full"
              tasks={loading ? undefined : filteredTasks}
              activeFilters={activeFilters}
              onCreateTask={handleCreateTask}
            />
          </motion.div>
        </SlideIn>
      </main>

      {/* Footer */}
      <FadeIn delay={0.5}>
        <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] mt-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-[var(--color-text-secondary)]">
                External Tracking System - Task Management
              </div>
              <div className="text-sm text-[var(--color-text-secondary)]">
                Real-time task synchronization
              </div>
            </div>
          </div>
        </footer>
      </FadeIn>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onTaskCreated={handleTaskCreated}
      />
    </PageTransition>
  );
}
