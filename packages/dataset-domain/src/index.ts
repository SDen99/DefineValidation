/**
 * @sden99/dataset-domain
 * 
 * Framework-agnostic dataset domain logic for clinical data management.
 * Contains business rules, validation, and data access patterns for
 * CDISC-compliant clinical datasets.
 */

// Export types
export type {
  Dataset,
  DatasetDetails,
  ProcessingStats,
  SelectionResult,
  DefineXMLInfo,
  ActiveDefineInfo,
  AvailableDataset,
  AvailableViews,
  DatasetState,
  DatasetClassification
} from './types/index.js';

// Export repository interface and implementation
export {
  type DatasetRepository,
  PlainDatasetRepository
} from './repository/index.js';

// Export business services
export {
  DatasetSelectionService
} from './services/index.js';

// Export utilities
export {
  normalizeDatasetId,
  isDefineXMLFile,
  isSASDatasetFile,
  getDatasetBaseName
} from './utils/index.js';

// Export pure functions for dataset creation
export { createDatasetFromProcessingResult } from './DatasetFactory.js';
export { calculateProcessingStats } from './ProcessingStatsCalculator.js';