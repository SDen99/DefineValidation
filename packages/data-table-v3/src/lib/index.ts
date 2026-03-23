/**
 * @sden99/data-table-v3 - Event-Driven Data Table
 *
 * Main entry point for the package.
 * Exports the wrapper component and reusable engines/utilities.
 */

// Main component (Phase 1-5 Complete)
export { default as ClinicalDataTableV3 } from './ClinicalDataTableV3.svelte';

// Export component prop types
export type { ClinicalDataState, WorkerState } from './ClinicalDataTableV3.svelte';

// Engines (Plain JS - reusable)
export { filterData } from './engines/filterData';
export { sortData } from './engines/sortData';
export { VirtualizationEngine } from './engines/VirtualizationEngine';

// Types
export type { DataRow } from './types/core';
export type { ColumnConfig } from './types/columns';
export type { Filter, TextFilter, NumericFilter, DateFilter, BooleanFilter, SetFilter, SerializedFilter, FilterCombination } from './types/filters';
export type { SortDirection, SortConfig } from './types/sorting';
export type { ValidationCheckDetail, ColumnValidationInfo } from './types/validation';

// Chart filter types (for Define-XML integration)
export type { DefineVariable, CodelistItem, DatasetDetails } from './chart-filters';

// FilterBar component
export { default as FilterBar } from './TableHeader/FilterBar.svelte';

// Utilities
export { PerDatasetPersistence } from './utils/PerDatasetPersistence';
export { serializeFilters, deserializeFilters } from './utils/filterSerialization';
export { toggleFilterNegation, isNegatedOperator } from './utils/filterNegation';
export { formatFilterChip } from './utils/filterFormatting';
