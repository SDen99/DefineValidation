/**
 * @sden99/vlm-processing
 * 
 * Variable-Level Metadata processing, stratification analysis, and UI components
 * for clinical data visualization and analysis.
 * 
 * @author Densham
 * @version 0.1.0
 */

// Core algorithms and processing
export * from './algorithms/index.js';
export * from './stratification/index.js';
export * from './analysis/index.js';
export * from './services/index.js';

// Utility functions  
export * from './utils/index.js';

// Type definitions
export * from './types/index.js';

// Main processing interface
export { VLMProcessingEngine } from './VLMProcessingEngine.js';
export { VLMProcessingService } from './services/VLMProcessingService.js';

// Reactive state management (selective exports to avoid conflicts)
export { 
  initializeVLMProcessing, 
  getVisibleColumns, 
  getParamcdFilter,
  updateParamcdFilter,
  updateColumnOrder,
  updateColumnWidth,
  toggleColumnVisibility,
  isColumnVisible,
  initializeVLM,
  toggleSection,
  isSectionExpanded,
  getExpandedSections,
  getColumnWidth,
  getColumnOrder,
  resetVLM,
  resetAllVLM,
  clearProcessingCache,
  getProcessingStats,
  getActiveVLMTableData,
  getActiveVariables,
  getVLMVariables,
  showAllColumns,
  clearParamcdFilter,
  getAllExpandableSectionIds,
  collapseAllRowSections,
  expandAllRowSections,
  // Raw state objects (for advanced usage)
  expandedSections,
  columnVisibility,
  columnWidths,
  columnOrder,
  paramcdFilters
} from './state/vlmReactiveState.svelte.js';

// Components (no wildcard export to avoid conflicts)
export type {
  VLMTableProps,
  StratificationTreeProps,
  AnalysisChartProps,
  HierarchyViewerProps,
  ProgressBarProps,
  VLMdataViewProps,
  VLMTableComponentProps,
  VLMTableRowProps,
  VLMFilterControlsProps
} from './components/types.js';

// Configuration and constants
export { DEFAULT_CONFIG } from './config';

/**
 * Package version
 */
export const VERSION = '0.1.0';

/**
 * Package metadata
 */
export const PACKAGE_INFO = {
  name: '@sden99/vlm-processing',
  version: VERSION,
  description: 'Variable-Level Metadata processing, stratification analysis, and UI components for clinical data',
  keywords: ['vlm', 'variable-level-metadata', 'clinical-data', 'cdisc', 'stratification', 'data-analysis']
} as const;