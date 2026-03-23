/**
 * Component prop types and interfaces
 */

import type { 
  VLMVariable, 
  StratificationHierarchy, 
  VariableAnalysis, 
  VLMProcessingResult,
  VLMTableData
} from '../types/index.js';

/**
 * Props for VLM Table View component
 */
export interface VLMTableProps {
  vlms: VLMVariable[];
  showStratification?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  onVLMSelect?: (vlm: VLMVariable) => void;
}

/**
 * Props for Stratification Tree component
 */
export interface StratificationTreeProps {
  hierarchy: StratificationHierarchy;
  expandedLevels?: Set<string>;
  onLevelToggle?: (levelId: string) => void;
  onLevelSelect?: (levelId: string) => void;
}

/**
 * Props for Variable Analysis Chart component
 */
export interface AnalysisChartProps {
  analyses: VariableAnalysis[];
  chartType?: 'bar' | 'pie' | 'scatter' | 'line';
  showLegend?: boolean;
  interactive?: boolean;
  onVariableSelect?: (variableName: string) => void;
}

/**
 * Props for VLM Hierarchy Viewer component
 */
export interface HierarchyViewerProps {
  processingResult: VLMProcessingResult;
  viewMode?: 'table' | 'tree' | 'graph';
  showDetails?: boolean;
  onHierarchySelect?: (hierarchyId: string) => void;
}

/**
 * Props for Processing Progress Bar component
 */
export interface ProgressBarProps {
  progress: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  message?: string;
  showPercentage?: boolean;
  onCancel?: () => void;
}

// ============================================
// VLM VIEW COMPONENT PROPS
// ============================================

/**
 * Props for VLMdataView component
 */
export interface VLMdataViewProps {
  datasetName: string;
  vlmTableData: VLMTableData | null;
  Alert?: any; // UI component injected as prop
  Button?: any; // UI component injected as prop
  ChevronDown?: any; // Icon component injected as prop
  ChevronRight?: any; // Icon component injected as prop
}

/**
 * Props for VLMTable component
 */
export interface VLMTableComponentProps {
  rows: any[];
  visibleColumns: string[];
  allColumns: string[];
  cleanDatasetName: string;
  stratificationColumns: Set<string>;
}

/**
 * Props for VLMTableRow component
 */
export interface VLMTableRowProps {
  row: any;
  visibleColumns: string[];
  cleanDatasetName: string;
  stratificationColumns: Set<string>;
  rowIndex: number;
}

/**
 * Props for VLMFilterControls component
 */
export interface VLMFilterControlsProps {
  datasetName: string;
  columns: string[];
}