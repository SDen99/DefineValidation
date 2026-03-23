/**
 * Core algorithms for VLM processing and analysis
 */

export { VLMProcessor } from './VLMProcessor';
export { VariableAnalyzer } from './VariableAnalyzer';
export { ConditionParser } from './ConditionParser';

// VLM Processing Algorithms (migrated from vlmProcessingState.svelte.ts)
// Note: detectVLMStratificationHierarchy and extractParamcdMapping are exported from ../stratification/hierarchyDetection
export { 
  generateEnhancedTransposedVLMTable,
  getEnhancedParameterConditionCombinations,
  processEnhancedWhereClause,
  createEnhancedVLMCellData,
  formatStratificationValue,
  enhanceVLMWithMethod
} from './vlmTableGenerator';
export { getVLMScopedVariables, getAllVariables } from './vlmDataAccessor';

// Re-export algorithm types
export type {
  ProcessorOptions,
  AnalysisOptions,
  ParserOptions
} from './types';