/**
 * Null/Empty validation operators
 */

import type { OperatorFn } from '../types';

/**
 * Check if a value is empty (null, undefined, or empty string).
 * Returns true if value IS empty (violation detected).
 *
 * @param value - The value to check
 * @param _expected - Unused (required by OperatorFn signature)
 * @returns true if value is empty (violation)
 */
export const empty: OperatorFn = (value: unknown, _expected?: unknown): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  return false;
};

/**
 * Check if a value is non-empty (has a value).
 * Returns true if value is NOT empty (violation detected when expecting empty).
 *
 * @param value - The value to check
 * @param _expected - Unused (required by OperatorFn signature)
 * @returns true if value is non-empty
 */
export const non_empty: OperatorFn = (value: unknown, _expected?: unknown): boolean => {
  return !empty(value, _expected);
};
