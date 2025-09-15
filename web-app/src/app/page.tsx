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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter groups configuration (removed Status filter)
  const filterGroups: FilterGroup[] = [
    {
      id: 'priority',
      label: 'Priority',
      multiSelect: true,
      options: [
        {
          id: 'urgent',
          label: 'Urgent',
          value: 'urgent',
          count: tasks.filter(t =>
            t.priority?.name.toLowerCase() === 'urgent' ||
            t.subtasks.some(st => st.priority?.name.toLowerCase() === 'urgent')
          ).length
        },
        {
          id: 'high',
          label: 'High',
          value: 'high',
          count: tasks.filter(t =>
            t.priority?.name.toLowerCase() === 'high' ||
            t.subtasks.some(st => st.priority?.name.toLowerCase() === 'high')
          ).length
        },
        {
          id: 'normal',
          label: 'Normal',
          value: 'normal',
          count: tasks.filter(t =>
            t.priority?.name.toLowerCase() === 'normal' ||
            t.subtasks.some(st => st.priority?.name.toLowerCase() === 'normal')
          ).length
        },
        {
          id: 'low',
          label: 'Low',
          value: 'low',
          count: tasks.filter(t =>
            t.priority?.name.toLowerCase() === 'low' ||
            t.subtasks.some(st => st.priority?.name.toLowerCase() === 'low')
          ).length
        },
      ]
    },
    {
      id: 'assignee',
      label: 'Assignee',
      multiSelect: true,
      options: Array.from(new Set([
        ...tasks.map(t => t.developer).filter(Boolean),
        ...tasks.flatMap(t => t.subtasks.map(st => st.developer).filter(Boolean))
      ])).map(dev => ({
        id: dev!,
        label: dev!,
        value: dev!,
        count: tasks.filter(t =>
          t.developer === dev ||
          t.subtasks.some(st => st.developer === dev)
        ).length
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
    setSearchQuery('');
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
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

  // Filter tasks and their subtasks based on search query and active filters
  // Filters are applied cumulatively (AND logic) - subtasks must match ALL active filters
  const filteredTasks = tasks.map(task => {
    // Create a copy of the task to avoid mutating the original
    const filteredTask = { ...task, subtasks: [...task.subtasks] };
    let shouldIncludeTask = true;
    
    // Start with all subtasks and progressively filter them
    let filteredSubtasks = [...task.subtasks];
    
    // FILTER 1: Search filter - special case: if parent matches, show all subtasks
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const taskNameMatches = task.name.toLowerCase().includes(query);
      
      if (!taskNameMatches) {
        // Parent doesn't match, so filter subtasks to only those matching the search
        filteredSubtasks = filteredSubtasks.filter(subtask =>
          subtask.name.toLowerCase().includes(query)
        );
      }
      // If parent matches search, keep all subtasks (don't filter by search)
    }

    // FILTER 2: Priority filter - filters the already search-filtered subtasks
    if (activeFilters.priority && activeFilters.priority.length > 0) {
      // Filter current subtasks to only those matching the priority
      filteredSubtasks = filteredSubtasks.filter(subtask =>
        subtask.priority && activeFilters.priority.includes(subtask.priority.name.toLowerCase())
      );
    }

    // FILTER 3: Assignee filter - filters the already search+priority filtered subtasks
    if (activeFilters.assignee && activeFilters.assignee.length > 0) {
      // Filter current subtasks to only those matching the assignee
      filteredSubtasks = filteredSubtasks.filter(subtask =>
        subtask.developer && activeFilters.assignee.includes(subtask.developer)
      );
    }
    
    // After all filters, subtasks must match ALL active filters (AND logic)
    
    // Update the filtered task with the filtered subtasks
    filteredTask.subtasks = filteredSubtasks;
    
    // Only include task if it has subtasks after filtering or if no filters are active
    const hasActiveFilters = searchQuery ||
      (activeFilters.priority && activeFilters.priority.length > 0) ||
      (activeFilters.assignee && activeFilters.assignee.length > 0);
    
    if (hasActiveFilters) {
      // For search filter: include task if parent name matches OR has matching subtasks
      if (searchQuery && task.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        shouldIncludeTask = true;
      }
      // For priority/assignee filters: ONLY include task if it has matching subtasks
      // Parent task properties don't matter for these filters
      else if (filteredSubtasks.length > 0) {
        shouldIncludeTask = true;
      } else {
        shouldIncludeTask = false;
      }
    }

    return shouldIncludeTask ? filteredTask : null;
  }).filter(task => task !== null) as ProcessedTask[];

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
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
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
