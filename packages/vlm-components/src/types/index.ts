/**
 * Types for VLM Components Package
 * Following the provider pattern for cross-package state management
 */

import type { ValueLevelMetadata, VLMViewMode } from '@sden99/vlm-processing';

/**
 * State provider interface for VLM components
 * Bridges main app state to VLM UI components
 * Following metadata-components pattern
 */
export interface VLMStateProvider {
  /**
   * Get the selected dataset name
   */
  getSelectedDatasetName(): string | null;

  /**
   * Get VLM variables for the selected dataset
   */
  getVLMVariables(): ValueLevelMetadata[];

  /**
   * Get active VLM table data
   * @param viewMode - 'compact' for PARAMCD-only rows, 'expanded' for full Cartesian expansion
   */
  getActiveVLMTableData(viewMode?: VLMViewMode): any;

  /**
   * Check if VLM data is available for the selected dataset
   */
  hasVLMData(): boolean;
}

/**
 * Component props interfaces
 */
export interface VLMdataViewProps {
  datasetName: string;
  stateProvider: VLMStateProvider;
  uiComponents?: {
    Alert?: any;
    Button?: any;
    Input?: any;
    Table?: any;
    TableBody?: any;
    ChevronDown?: any;
    ChevronRight?: any;
  };
}

export interface VLMTableProps {
  rows: any[];
  visibleColumns: string[];
  allColumns: string[];
  cleanDatasetName: string;
  stratificationColumns: Set<string>;
  uiComponents?: {
    Table?: any;
    TableBody?: any;
  };
}

export interface VLMFilterControlsProps {
  cleanDatasetName: string;
  allColumns: string[];
  uiComponents?: {
    Input?: any;
    Button?: any;
  };
}

/**
 * Re-export types from vlm-processing for convenience
 */
export type {
  ValueLevelMetadata,
  VLMViewMode,
  DisplayCondition,
  VLMComparator,
  VLMTableRow,
  VLMTableData
} from '@sden99/vlm-processing';