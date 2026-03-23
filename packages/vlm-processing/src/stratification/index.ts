/**
 * Stratification analysis and hierarchy management for VLM
 */

export { StratificationBuilder } from './StratificationBuilder';
export { HierarchyManager } from './HierarchyManager';
export { StratificationAnalyzer } from './StratificationAnalyzer';

// Migrated hierarchy detection functions
export * from './hierarchyDetection';

// Re-export stratification types
export type {
  BuilderConfig,
  AnalyzerConfig,
  HierarchyConfig
} from './types';