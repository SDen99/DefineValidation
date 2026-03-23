/**
 * Codelist validation operators
 */

import type { OperatorFn } from '../types';

/**
 * Check if a value is in the allowed codelist.
 * Returns true if value IS in the list (no violation).
 * Returns true for null/undefined values (handled separately).
 *
 * Note: This is a helper used internally by is_not_contained_by.
 * Unlike most operators, returning true here means NO violation.
 *
 * @param value - The value to check
 * @param allowedValues - Array of allowed values
 * @returns true if value is in the list or is null/empty (no violation)
 */
export const is_contained_by: OperatorFn = (
  value: unknown,
  allowedValues: unknown
): boolean => {
  // Null/undefined values pass - they should be caught by 'empty' check if required
  if (value === null || value === undefined || value === '') {
    return true;
  }

  // Ensure allowedValues is an array
  if (!Array.isArray(allowedValues)) {
    console.warn('is_contained_by: allowedValues is not an array');
    return true; // Can't validate without proper codelist
  }

  // Convert value to string for comparison (codelists are typically strings)
  const stringValue = String(value);

  // Check if value is in the allowed list
  return allowedValues.some((allowed) => String(allowed) === stringValue);
};

/**
 * Check if a value is NOT in the allowed codelist.
 * Returns true if value is NOT in the list (FAILS validation).
 * This is the inverse of is_contained_by - used for finding violations.
 *
 * @param value - The value to check
 * @param allowedValues - Array of allowed values
 * @returns true if value FAILS validation (is not in list)
 */
export const is_not_contained_by: OperatorFn = (
  value: unknown,
  allowedValues: unknown
): boolean => {
  return !is_contained_by(value, allowedValues);
};
