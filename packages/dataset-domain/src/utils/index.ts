/**
 * Dataset utilities and helper functions
 */

/**
 * Normalizes dataset ID by removing file extensions and converting to lowercase
 */
export function normalizeDatasetId(id: string): string {
  return id.replace(/\.(sas7bdat|xpt|xml|json)$/i, '').toLowerCase();
}

/**
 * Checks if a filename represents a DefineXML file
 */
export function isDefineXMLFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.xml');
}

/**
 * Checks if a filename represents a SAS dataset file (sas7bdat, xpt, or json)
 */
export function isSASDatasetFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return lowerName.endsWith('.sas7bdat') || lowerName.endsWith('.xpt') || lowerName.endsWith('.json');
}

/**
 * Checks if a filename represents a Dataset-JSON file
 */
export function isDatasetJsonFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.json');
}

/**
 * Extracts the base name from a dataset filename
 */
export function getDatasetBaseName(fileName: string): string {
  return fileName.replace(/\.(sas7bdat|xpt|xml|json)$/i, '');
}