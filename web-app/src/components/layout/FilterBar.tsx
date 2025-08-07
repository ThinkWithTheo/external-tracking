'use client';

import React, { useState } from 'react';
import { X, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface FilterOption {
  id: string;
  label: string;
  value: string;
  count?: number;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

interface FilterBarProps {
  filterGroups: FilterGroup[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (groupId: string, values: string[]) => void;
  onClearAll: () => void;
  className?: string;
}

interface FilterChipProps {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  onRemove?: () => void;
  variant?: 'default' | 'status' | 'priority' | 'assignee';
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  count,
  isActive,
  onClick,
  onRemove,
  variant = 'default'
}) => {
  const getVariantStyles = () => {
    if (isActive) {
      switch (variant) {
        case 'status':
          return 'bg-[var(--color-primary-500)] text-white border-[var(--color-primary-500)]';
        case 'priority':
          return 'bg-[var(--color-warning-500)] text-white border-[var(--color-warning-500)]';
        case 'assignee':
          return 'bg-[var(--color-success-500)] text-white border-[var(--color-success-500)]';
        default:
          return 'bg-[var(--color-primary-500)] text-white border-[var(--color-primary-500)]';
      }
    }
    return 'bg-[var(--color-surface)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-primary-300)] hover:bg-[var(--color-surface-hover)]';
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 hover:shadow-sm",
        getVariantStyles()
      )}
    >
      <span>{label}</span>
      {count !== undefined && (
        <Badge
          variant="secondary"
          className={cn(
            "h-4 w-4 rounded-full p-0 text-xs",
            isActive ? "bg-white/20 text-white" : "bg-[var(--color-border-light)]"
          )}
        >
          {count}
        </Badge>
      )}
      {isActive && onRemove && (
        <X
          className="h-3 w-3 ml-1 hover:bg-white/20 rounded-full cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </button>
  );
};

const FilterDropdown: React.FC<{
  group: FilterGroup;
  activeValues: string[];
  onSelectionChange: (values: string[]) => void;
}> = ({ group, activeValues, onSelectionChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOptionClick = (optionValue: string) => {
    if (group.multiSelect) {
      const newValues = activeValues.includes(optionValue)
        ? activeValues.filter(v => v !== optionValue)
        : [...activeValues, optionValue];
      onSelectionChange(newValues);
    } else {
      const newValues = activeValues.includes(optionValue) ? [] : [optionValue];
      onSelectionChange(newValues);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "gap-2",
          activeValues.length > 0 && "border-[var(--color-primary-500)] text-[var(--color-primary-600)]"
        )}
      >
        <Filter className="h-3 w-3" />
        {group.label}
        {activeValues.length > 0 && (
          <Badge variant="default" className="h-4 w-4 rounded-full p-0 text-xs">
            {activeValues.length}
          </Badge>
        )}
        <ChevronDown className={cn(
          "h-3 w-3 transition-transform",
          isOpen && "rotate-180"
        )} />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 z-20 mt-1 w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
            <div className="p-2 space-y-1">
              {group.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(option.value)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors text-left",
                    activeValues.includes(option.value)
                      ? "bg-[var(--color-primary-100)] text-[var(--color-primary-700)]"
                      : "hover:bg-[var(--color-surface-hover)]"
                  )}
                >
                  <span>{option.label}</span>
                  {option.count !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {option.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const FilterBar: React.FC<FilterBarProps> = ({
  filterGroups,
  activeFilters,
  onFilterChange,
  onClearAll,
  className
}) => {
  const totalActiveFilters = Object.values(activeFilters).flat().length;

  // Quick filter chips for common filters
  const quickFilters = [
    { id: 'high-priority', label: 'High Priority', variant: 'priority' as const },
    { id: 'in-progress', label: 'In Progress', variant: 'status' as const },
    { id: 'overdue', label: 'Overdue', variant: 'priority' as const },
    { id: 'assigned-to-me', label: 'Assigned to Me', variant: 'assignee' as const },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Quick Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-text-secondary)] mr-2">
          Quick Filters:
        </span>
        {quickFilters.map((filter) => (
          <FilterChip
            key={filter.id}
            label={filter.label}
            variant={filter.variant}
            isActive={false} // This would be connected to actual filter state
            onClick={() => {
              // Handle quick filter click
              console.log('Quick filter clicked:', filter.id);
            }}
          />
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-text-secondary)] mr-2">
          Filters:
        </span>
        
        {filterGroups.map((group) => (
          <FilterDropdown
            key={group.id}
            group={group}
            activeValues={activeFilters[group.id] || []}
            onSelectionChange={(values) => onFilterChange(group.id, values)}
          />
        ))}

        {totalActiveFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            Clear All ({totalActiveFilters})
          </Button>
        )}
      </div>

      {/* Active Filter Tags */}
      {totalActiveFilters > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text-secondary)] mr-2">
            Active:
          </span>
          {Object.entries(activeFilters).map(([groupId, values]) =>
            values.map((value) => {
              const group = filterGroups.find(g => g.id === groupId);
              const option = group?.options.find(o => o.value === value);
              if (!option) return null;

              return (
                <FilterChip
                  key={`${groupId}-${value}`}
                  label={option.label}
                  isActive={true}
                  onClick={() => {}}
                  onRemove={() => {
                    const newValues = activeFilters[groupId].filter(v => v !== value);
                    onFilterChange(groupId, newValues);
                  }}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
export type { FilterGroup, FilterOption };