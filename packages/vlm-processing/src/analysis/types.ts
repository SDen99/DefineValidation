/**
 * Analysis-specific type definitions
 */

/**
 * Comprehensive analysis report
 */
export interface AnalysisReport {
  summary: {
    totalVLMs: number;
    processedVLMs: number;
    stratificationLevels: number;
    processingTime: number;
  };
  details: {
    variableBreakdown: Record<string, number>;
    conditionComplexity: Record<string, number>;
    hierarchyDepths: number[];
  };
  recommendations: string[];
}

/**
 * Statistical analysis report
 */
export interface StatisticsReport {
  descriptive: {
    mean: number;
    median: number;
    standardDeviation: number;
    variance: number;
  };
  distribution: {
    skewness: number;
    kurtosis: number;
    quartiles: [number, number, number];
  };
  quality: {
    completeness: number;
    consistency: number;
    accuracy: number;
  };
}

/**
 * Configuration for analysis processes
 */
export interface AnalysisConfig {
  includeDetailedStats: boolean;
  generateRecommendations: boolean;
  validateResults: boolean;
  outputFormat: 'json' | 'xml' | 'csv';
}