/**
 * Utility-specific type definitions
 */

/**
 * Result of validation operations
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details?: Record<string, any>;
}

/**
 * Options for formatting operations
 */
export interface FormatOptions {
  dateFormat?: string;
  numberPrecision?: number;
  includeMetadata?: boolean;
  compact?: boolean;
}

/**
 * Configuration for helper functions
 */
export interface HelperConfig {
  strictMode?: boolean;
  enableCaching?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}