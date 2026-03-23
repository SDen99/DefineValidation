// Main exports
export * from './types';
export * from './definexml';
export * from './sas7bdat';
export * from './datasetjson';
export * from './graphXML';


// Re-export commonly used types for convenience
export type {
  ProcessingResult,
  DefineXMLProcessingResult,
  Sas7bdatProcessingResult,
  DatasetJsonProcessingResult,
  GraphData,
  EnhancedDefineXMLData,
  ValidationResult
} from './types/processing';

// Re-export the graphXML function and interfaces
export { graphXML } from './graphXML';
export type { EnhancedDefineXML } from './graphXML';

// Import specific functions for factory (avoiding circular imports)
import { DefineXMLDataProcessor, processDefineXMLString, validateDefineXMLString } from './definexml/processor';
import { Sas7bdatDataProcessor, processSas7bdatBuffer, validateSas7bdatBuffer } from './sas7bdat/processor';
import { DatasetJsonProcessor, processDatasetJson, validateDatasetJson } from './datasetjson/processor';
import { graphXML } from './graphXML';

/**
 * Convenience factory for creating data processors and accessing utilities
 * Provides a simple API for common operations
 */
export const DataProcessors = {
  // Factory methods for creating processor instances
  createDefineXMLProcessor: () => new DefineXMLDataProcessor(),
  createSas7bdatProcessor: () => new Sas7bdatDataProcessor(),
  createDatasetJsonProcessor: () => new DatasetJsonProcessor(),

  // Direct access to pure functions
  processDefineXMLString,
  processSas7bdatBuffer,
  processDatasetJson,

  // Utilities
  graphXML,

  // Validation helpers
  validateDefineXMLString,
  validateSas7bdatBuffer,
  validateDatasetJson
};