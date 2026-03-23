/**
 * Comparison validation operators
 */

import type { OperatorFn } from '../types';

/**
 * Check if a value equals the expected value.
 * Returns true if values ARE equal (use for detecting when they should NOT be equal).
 *
 * @param value - The value to check
 * @param expected - The expected value
 * @returns true if values are equal
 */
export const equal_to: OperatorFn = (value: unknown, expected: unknown): boolean => {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return expected === null || expected === undefined;
  }

  // String comparison (case-sensitive)
  if (typeof value === 'string' || typeof expected === 'string') {
    return String(value) === String(expected);
  }

  // Numeric comparison
  if (typeof value === 'number' && typeof expected === 'number') {
    return value === expected;
  }

  // Boolean comparison
  if (typeof value === 'boolean' && typeof expected === 'boolean') {
    return value === expected;
  }

  // Fallback to string comparison
  return String(value) === String(expected);
};

/**
 * Check if a value does NOT equal the expected value.
 * Returns true if values are NOT equal (use for detecting when they SHOULD be equal).
 *
 * @param value - The value to check
 * @param expected - The expected value
 * @returns true if values are not equal
 */
export const not_equal_to: OperatorFn = (value: unknown, expected: unknown): boolean => {
  return !equal_to(value, expected);
};

/**
 * Check if a numeric value is greater than the threshold.
 * Returns true if value > threshold (violation detected).
 * Non-numeric values return false (no violation).
 *
 * @param value - The value to check
 * @param threshold - The threshold value
 * @returns true if value is greater than threshold
 */
export const greater_than: OperatorFn = (value: unknown, threshold: unknown): boolean => {
  // Skip null/undefined
  if (value === null || value === undefined || value === '') {
    return false;
  }

  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  const numThreshold = typeof threshold === 'number' ? threshold : parseFloat(String(threshold));

  // If either is NaN, no violation
  if (isNaN(numValue) || isNaN(numThreshold)) {
    return false;
  }

  return numValue > numThreshold;
};

/**
 * Check if a numeric value is less than the threshold.
 * Returns true if value < threshold (violation detected).
 * Non-numeric values return false (no violation).
 *
 * @param value - The value to check
 * @param threshold - The threshold value
 * @returns true if value is less than threshold
 */
export const less_than: OperatorFn = (value: unknown, threshold: unknown): boolean => {
  // Skip null/undefined
  if (value === null || value === undefined || value === '') {
    return false;
  }

  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  const numThreshold = typeof threshold === 'number' ? threshold : parseFloat(String(threshold));

  // If either is NaN, no violation
  if (isNaN(numValue) || isNaN(numThreshold)) {
    return false;
  }

  return numValue < numThreshold;
};

/**
 * Check if a numeric value is greater than or equal to the threshold.
 * Returns true if value >= threshold (violation detected).
 *
 * @param value - The value to check
 * @param threshold - The threshold value
 * @returns true if value is greater than or equal to threshold
 */
export const greater_than_or_equal_to: OperatorFn = (value: unknown, threshold: unknown): boolean => {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  const numThreshold = typeof threshold === 'number' ? threshold : parseFloat(String(threshold));

  if (isNaN(numValue) || isNaN(numThreshold)) {
    return false;
  }

  return numValue >= numThreshold;
};

/**
 * Check if a numeric value is less than or equal to the threshold.
 * Returns true if value <= threshold (violation detected).
 *
 * @param value - The value to check
 * @param threshold - The threshold value
 * @returns true if value is less than or equal to threshold
 */
export const less_than_or_equal_to: OperatorFn = (value: unknown, threshold: unknown): boolean => {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  const numThreshold = typeof threshold === 'number' ? threshold : parseFloat(String(threshold));

  if (isNaN(numValue) || isNaN(numThreshold)) {
    return false;
  }

  return numValue <= numThreshold;
};
