/**
 * Core type definitions for Data Table V2
 */

// Base data row type - must be an object with string keys
export type DataRow = Record<string, unknown>;

// Filter predicate function
export type FilterPredicate<T extends DataRow = DataRow> = (row: T) => boolean;

// Sort configuration
export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

// Filter state
export interface FilterState {
  _global?: string; // Global search
  [columnId: string]: any; // Column-specific filters
}

// Column definition
export interface ColumnDefinition {
  id: string;
  header: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  width?: number;
  visible?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  formatter?: (value: unknown) => string;
}

// View state (for persistence)
export interface ViewState {
  visibleColumns: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
  sortConfig: SortConfig[];
  filterState: FilterState;
  scrollPosition?: number;
}

// DataManager events
export interface DataManagerEvents<T extends DataRow = DataRow> {
  'data-changed': T[];
  'data-loaded': { data: T[]; totalCount: number };
  'error': Error;
}

// Virtualization config
export interface VirtualizationConfig {
  rowHeight: number;
  overscan: number;
  preloadThreshold: number;
}

// Data source interface
export interface DataSource<T extends DataRow = DataRow> {
  setData(data: T[]): Promise<void> | void;
  getTotalCount(filters?: FilterState): Promise<number>;
  loadWindow(
    startIndex: number,
    endIndex: number,
    options?: LoadOptions
  ): Promise<T[]>;
  getUniqueValues?(columnId: string): Promise<unknown[]>;
  clear(): void;
}

export interface LoadOptions {
  sortConfig?: SortConfig[];
  filterState?: FilterState;
}

// Persistence service
export interface PersistenceService {
  load(key: string): ViewState | null;
  save(key: string, state: ViewState): void;
  clear(key: string): void;
}
