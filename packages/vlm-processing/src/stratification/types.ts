/**
 * Stratification-specific type definitions
 */

/**
 * Configuration for stratification builder
 */
export interface BuilderConfig {
  maxDepth: number;
  autoBalance: boolean;
  mergeEmptyLevels: boolean;
}

/**
 * Configuration for stratification analyzer
 */
export interface AnalyzerConfig {
  includeStats: boolean;
  validateHierarchy: boolean;
  detectCycles: boolean;
}

/**
 * Configuration for hierarchy management
 */
export interface HierarchyConfig {
  allowMultipleRoots: boolean;
  enforceUniqueness: boolean;
  enableCaching: boolean;
}