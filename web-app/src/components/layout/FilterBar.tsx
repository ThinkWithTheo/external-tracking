'use client';

import React, { useState } from 'react';
import { X, Filter, ChevronDown, Search } from 'lucide-react';
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
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
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
  searchQuery = '',
  onSearchChange,
  className
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const totalActiveFilters = Object.values(activeFilters).flat().length;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
    onSearchChange?.(value);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search and Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={localSearchQuery}
            onChange={handleSearchChange}
            placeholder="Search tasks and subtasks..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent"
          />
        </div>
        
        {/* Filter Dropdowns - excluding Status */}
        {filterGroups.filter(group => group.id !== 'status').map((group) => (
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
      {(totalActiveFilters > 0 || localSearchQuery) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text-secondary)] mr-2">
            Active:
          </span>
          
          {/* Search Query Tag */}
          {localSearchQuery && (
            <FilterChip
              label={`Search: "${localSearchQuery}"`}
              isActive={true}
              onClick={() => {}}
              onRemove={() => {
                setLocalSearchQuery('');
                onSearchChange?.('');
              }}
            />
          )}
          
          {/* Filter Tags */}
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