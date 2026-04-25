import type { EnhancedDefineXMLData, GraphData } from '@sden99/data-processing';
import type { ParsedDefineXML, ItemGroup } from '@sden99/cdisc-types/define-xml';

/**
 * Core Dataset interface
 */
export interface Dataset {
  fileName: string;
  data: any[] | ParsedDefineXML | null;
  details?: DatasetDetails;
  graphData?: GraphData | null;
  enhancedDefineXML?: EnhancedDefineXMLData | null;
  processingStats?: ProcessingStats;
  ADaM?: boolean;
  SDTM?: boolean;
  SEND?: boolean;
}

export interface DatasetDetails {
  num_rows: number;
  num_columns: number;
  columns: string[];
  dtypes: Record<string, string>;
  summary: Record<string, any>;
}

export interface ProcessingStats {
  uploadTime: number | null;
  numColumns: number | null;
  numRows: number | null;
  datasetSize: number | null;
}

/**
 * Domain-specific result types
 */
export interface SelectionResult {
  success: boolean;
  selectedId: string | null;
  selectedDomain: string | null;
  dataset?: Dataset;
  error?: string;
}

export interface DefineXMLInfo {
  SDTM: ParsedDefineXML | null;
  ADaM: ParsedDefineXML | null;
  SEND: ParsedDefineXML | null;
  sdtmId: string | null;
  adamId: string | null;
  sendId: string | null;
}

export interface ActiveDefineInfo {
  define: ParsedDefineXML | null;
  type: 'SDTM' | 'ADaM' | 'SEND' | null;
}

export interface AvailableDataset {
  id: string;
  name: string;
}

export interface AvailableViews {
  data: boolean;
  metadata: boolean;
  VLM: boolean;
}

export interface DatasetState {
  hasData: boolean;
  hasMetadata: boolean;
  isLoading: boolean;
  error?: string;
  progress: number;
}

export interface DatasetClassification {
  isDefineXML: boolean;
  isTabular: boolean;
  type: 'SDTM' | 'ADaM' | 'SEND' | 'TABULAR' | 'UNKNOWN';
}