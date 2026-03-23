/**
 * Formatting utility functions
 */

import type { FormatOptions } from './types';

/**
 * Collection of formatting utility functions
 */
export const formatUtils = {
  /**
   * Format VLM data for display
   */
  formatVLMData(data: any, options?: FormatOptions): string {
    return JSON.stringify(data, null, options?.compact ? 0 : 2);
  },

  /**
   * Format condition strings
   */
  formatCondition(condition: string): string {
    return condition.trim();
  },

  /**
   * Format numbers with specified precision
   */
  formatNumber(value: number, precision?: number): string {
    return value.toFixed(precision || 2);
  }
};