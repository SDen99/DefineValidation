/**
 * Column type definitions for Data Table V2
 */

import type { DataRow } from './core';

// Column data type
export type ColumnDataType = 'string' | 'number' | 'date' | 'boolean' | 'mixed';

// Column definition
export interface ColumnConfig {
  id: string;
  header: string;
  dataType: ColumnDataType;
  visible: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable: boolean;
  filterable: boolean;
  resizable: boolean;
  order: number; // Display order
  formatter?: (value: unknown) => string;
  metadata?: Record<string, unknown>;
}

// Column state (for persistence)
export interface ColumnState {
  visibleColumns: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
}

// Column manager events
export interface ColumnManagerEvents {
  'visibility-changed': {
    columnId: string;
    visible: boolean;
  };
  'order-changed': {
    columnOrder: string[];
  };
  'width-changed': {
    columnId: string;
    width: number;
  };
  'columns-reset': {};
  'state-persisted': {
    key: string;
  };
  'state-loaded': {
    key: string;
    state: ColumnState;
  };
}

// Column statistics
export interface ColumnStats {
  totalColumns: number;
  visibleColumns: number;
  hiddenColumns: number;
  customizedWidths: number;
}
