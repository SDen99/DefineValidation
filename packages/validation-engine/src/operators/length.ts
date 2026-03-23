/**
 * Length validation operators
 */

import type { OperatorFn } from '../types';

/**
 * Get the length of a value as a string.
 * @param value - The value to measure
 * @returns The string length, or 0 for null/undefined
 */
function getLength(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return String(value).length;
}

/**
 * Check if a value's length is longer than the maximum.
 * Returns true if length > maxLength (violation detected).
 *
 * @param value - The value to check
 * @param maxLength - The maximum allowed length
 * @returns true if value is longer than maxLength
 */
export const longer_than: OperatorFn = (value: unknown, maxLength: unknown): boolean => {
  // Skip null/undefined - they have length 0
  if (value === null || value === undefined || value === '') {
    return false;
  }

  const valueLength = getLength(value);
  const max = typeof maxLength === 'number' ? maxLength : parseInt(String(maxLength), 10);

  if (isNaN(max)) {
    console.warn('longer_than: Invalid maxLength:', maxLength);
    return false;
  }

  return valueLength > max;
};

/**
 * Check if a value's length is shorter than the minimum.
 * Returns true if length < minLength (violation detected).
 *
 * @param value - The value to check
 * @param minLength - The minimum required length
 * @returns true if value is shorter than minLength
 */
export const shorter_than: OperatorFn = (value: unknown, minLength: unknown): boolean => {
  // Skip null/undefined for minimum length check
  if (value === null || value === undefined) {
    return false;
  }

  const valueLength = getLength(value);
  const min = typeof minLength === 'number' ? minLength : parseInt(String(minLength), 10);

  if (isNaN(min)) {
    console.warn('shorter_than: Invalid minLength:', minLength);
    return false;
  }

  return valueLength < min;
};

/**
 * Check if a value's length equals the expected length.
 * Returns true if length === expectedLength (use for detecting when they should NOT match).
 *
 * @param value - The value to check
 * @param expectedLength - The expected length
 * @returns true if value has the exact expected length
 */
export const has_equal_length: OperatorFn = (value: unknown, expectedLength: unknown): boolean => {
  // For null/undefined, check if expected length is 0
  if (value === null || value === undefined) {
    const expected = typeof expectedLength === 'number' ? expectedLength : parseInt(String(expectedLength), 10);
    return expected === 0;
  }

  const valueLength = getLength(value);
  const expected = typeof expectedLength === 'number' ? expectedLength : parseInt(String(expectedLength), 10);

  if (isNaN(expected)) {
    console.warn('has_equal_length: Invalid expectedLength:', expectedLength);
    return false;
  }

  return valueLength === expected;
};

/**
 * Check if a value's length does NOT equal the expected length.
 * Returns true if length !== expectedLength (violation detected).
 *
 * @param value - The value to check
 * @param expectedLength - The expected length
 * @returns true if value does not have the expected length
 */
export const has_not_equal_length: OperatorFn = (value: unknown, expectedLength: unknown): boolean => {
  // Skip null/undefined
  if (value === null || value === undefined) {
    return false;
  }

  return !has_equal_length(value, expectedLength);
};

/**
 * Check if a value's length is within a range (inclusive).
 * Expects value to be [minLength, maxLength] array.
 * Returns true if length is within range.
 *
 * @param value - The value to check
 * @param range - Array of [minLength, maxLength]
 * @returns true if value length is within the range
 */
export const length_in_range: OperatorFn = (value: unknown, range: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (!Array.isArray(range) || range.length !== 2) {
    console.warn('length_in_range: Expected [minLength, maxLength] array');
    return false;
  }

  const valueLength = getLength(value);
  const min = typeof range[0] === 'number' ? range[0] : parseInt(String(range[0]), 10);
  const max = typeof range[1] === 'number' ? range[1] : parseInt(String(range[1]), 10);

  if (isNaN(min) || isNaN(max)) {
    console.warn('length_in_range: Invalid range values:', range);
    return false;
  }

  return valueLength >= min && valueLength <= max;
};
