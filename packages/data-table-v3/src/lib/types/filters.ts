/**
 * Filter type definitions for Data Table V2
 */

import type { DataRow } from './core';

// Filter types
export type FilterType =
  | 'text'
  | 'numeric'
  | 'date'
  | 'set'
  | 'boolean'
  | 'global';

// Text filter operators
export type TextFilterOperator =
  | 'contains'
  | 'equals'
  | 'startsWith'
  | 'endsWith'
  | 'notContains'
  | 'notEquals'
  | 'notStartsWith'
  | 'notEndsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'in'; // For set-based filtering (comma-separated values)

// Numeric filter operators
export type NumericFilterOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'between'
  | 'notBetween'
  | 'isEmpty'
  | 'isNotEmpty';

// Date filter operators
export type DateFilterOperator =
  | 'equals'
  | 'notEquals'
  | 'before'
  | 'after'
  | 'between'
  | 'notBetween'
  | 'isEmpty'
  | 'isNotEmpty';

// Set filter operators
export type SetFilterOperator = 'in' | 'notIn';

// Filter operator union
export type FilterOperator =
  | TextFilterOperator
  | NumericFilterOperator
  | DateFilterOperator
  | SetFilterOperator;

// Base filter configuration
export interface BaseFilter {
  columnId: string;
  type: FilterType;
  operator: FilterOperator;
  enabled?: boolean;
}

// Text filter
export interface TextFilter extends BaseFilter {
  type: 'text';
  operator: TextFilterOperator;
  value: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

// Numeric filter
export interface NumericFilter extends BaseFilter {
  type: 'numeric';
  operator: NumericFilterOperator;
  value: number;
  value2?: number; // For 'between' operator
}

// Date filter
export interface DateFilter extends BaseFilter {
  type: 'date';
  operator: DateFilterOperator;
  value: Date | string;
  value2?: Date | string; // For 'between' operator
}

// Set filter (for selecting from a list of values)
export interface SetFilter extends BaseFilter {
  type: 'set';
  operator: SetFilterOperator;
  values: unknown[];
}

// Boolean filter
export interface BooleanFilter extends BaseFilter {
  type: 'boolean';
  operator: 'equals';
  value: boolean;
}

// Global search filter (searches across all columns)
export interface GlobalFilter {
  type: 'global';
  value: string;
  caseSensitive?: boolean;
  searchableColumns?: string[]; // If specified, only search these columns
  enabled?: boolean;
}

// Union of all filter types
export type Filter =
  | TextFilter
  | NumericFilter
  | DateFilter
  | SetFilter
  | BooleanFilter
  | GlobalFilter;

// Filter combination strategy
export type FilterCombination = 'AND' | 'OR';

// Filter configuration for a column
export interface ColumnFilterConfig {
  columnId: string;
  filters: Filter[];
  combination?: FilterCombination; // How to combine multiple filters on same column
}

// Complete filter state
export interface FilterConfiguration {
  columnFilters: Map<string, ColumnFilterConfig>;
  globalFilter?: GlobalFilter;
  filterCombination: FilterCombination; // How to combine filters across columns
}

// Filter events
export interface FilterEngineEvents<T extends DataRow = DataRow> {
  'filter-applied': {
    filteredData: T[];
    filterCount: number;
    originalCount: number;
  };
  'filter-cleared': { columnId?: string };
  'global-search-applied': { searchTerm: string; resultCount: number };
}

// Filter statistics
export interface FilterStats {
  totalRows: number;
  filteredRows: number;
  filterPercentage: number;
  activeFilters: number;
  filtersByColumn: Map<string, number>;
}

// ============================================================================
// Serialization Types (for localStorage persistence)
// ============================================================================

/**
 * JSON-safe filter representation for persistence
 * All Date objects are converted to ISO strings
 */
export interface SerializedTextFilter {
  type: 'text';
  columnId: string;
  operator: TextFilterOperator;
  value: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  enabled?: boolean;
}

export interface SerializedNumericFilter {
  type: 'numeric';
  columnId: string;
  operator: NumericFilterOperator;
  value: number;
  value2?: number;
  enabled?: boolean;
}

export interface SerializedDateFilter {
  type: 'date';
  columnId: string;
  operator: DateFilterOperator;
  value: string; // ISO date string
  value2?: string; // ISO date string
  enabled?: boolean;
}

export interface SerializedSetFilter {
  type: 'set';
  columnId: string;
  operator: SetFilterOperator;
  values: unknown[];
  enabled?: boolean;
}

export interface SerializedBooleanFilter {
  type: 'boolean';
  columnId: string;
  operator: 'equals';
  value: boolean;
  enabled?: boolean;
}

export interface SerializedGlobalFilter {
  type: 'global';
  value: string;
  caseSensitive?: boolean;
  searchableColumns?: string[];
  enabled?: boolean;
}

/**
 * Union type for all serialized filters
 */
export type SerializedFilter =
  | SerializedTextFilter
  | SerializedNumericFilter
  | SerializedDateFilter
  | SerializedSetFilter
  | SerializedBooleanFilter
  | SerializedGlobalFilter;
