/**
 * Algorithm-specific type definitions
 */

/**
 * Options for VLM processor
 */
export interface ProcessorOptions {
  preserveMetadata: boolean;
  validateConditions: boolean;
  generateIds: boolean;
}

/**
 * Options for variable analysis
 */
export interface AnalysisOptions {
  includeStatistics: boolean;
  analyzeDistribution: boolean;
  detectOutliers: boolean;
}

/**
 * Options for condition parser
 */
export interface ParserOptions {
  strictMode: boolean;
  allowNestedConditions: boolean;
  maxComplexity: number;
}