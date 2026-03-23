/**
 * Sorting type definitions for Data Table V2
 */

import type { DataRow } from './core';

// Sort direction
export type SortDirection = 'asc' | 'desc';

// Sort configuration for a single column
export interface SortConfig {
  columnId: string;
  direction: SortDirection;
}

// Sort configuration with priority
export interface SortConfigWithPriority extends SortConfig {
  priority: number; // Lower number = higher priority
}

// Sort comparator function
export type SortComparator<T = unknown> = (a: T, b: T) => number;

// Sort engine events
export interface SortEngineEvents<T extends DataRow = DataRow> {
  'sort-applied': {
    sortedData: T[];
    sortConfigs: SortConfig[];
  };
  'sort-cleared': {};
}

// Sort options
export interface SortOptions {
  // Clinical data mode: Always prioritize USUBJID if present
  clinicalMode?: boolean;
  // Priority column (always sorted first, regardless of sort configs)
  priorityColumn?: string;
  // Stable sort (preserves original order for equal elements)
  stable?: boolean;
  // Case sensitive string comparison
  caseSensitive?: boolean;
  // Null handling: 'first' | 'last'
  nullHandling?: 'first' | 'last';
}

// Sort statistics
export interface SortStats {
  activeSorts: number;
  sortColumns: string[];
  clinicalMode: boolean;
}
