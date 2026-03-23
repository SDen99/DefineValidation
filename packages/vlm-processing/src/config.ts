/**
 * Default configuration for VLM processing
 */

import type { VLMProcessingConfig } from './types';

/**
 * Default configuration for VLM processing operations
 */
export const DEFAULT_CONFIG: VLMProcessingConfig = {
  enableStratification: true,
  maxStratificationDepth: 5,
  includeEmptyConditions: false,
  preserveOriginalOrder: true,
};

/**
 * Performance configuration constants
 */
export const PERFORMANCE_CONFIG = {
  MAX_PROCESSING_TIME: 30000, // 30 seconds
  BATCH_SIZE: 1000,
  CACHE_SIZE: 100,
  MEMORY_LIMIT: 100 * 1024 * 1024, // 100MB
} as const;

/**
 * Validation configuration
 */
export const VALIDATION_CONFIG = {
  MAX_CONDITION_LENGTH: 1000,
  MAX_VARIABLE_NAME_LENGTH: 100,
  ALLOWED_CONDITION_OPERATORS: ['=', '!=', '<', '>', '<=', '>=', 'IN', 'NOT IN', 'LIKE', 'IS NULL', 'IS NOT NULL'],
  REQUIRED_METADATA_FIELDS: ['name', 'dataType', 'label'],
} as const;