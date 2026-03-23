/**
 * String validation operators
 */

import type { OperatorFn } from '../types';

/**
 * Check if a value contains a substring.
 * Returns true if value CONTAINS the substring (violation detected).
 *
 * @param value - The value to check
 * @param substring - The substring to search for
 * @returns true if value contains the substring
 */
export const contains: OperatorFn = (value: unknown, substring: unknown): boolean => {
  // Skip null/undefined
  if (value === null || value === undefined) {
    return false;
  }

  const strValue = String(value);
  const strSubstring = String(substring);

  return strValue.includes(strSubstring);
};

/**
 * Check if a value does NOT contain a substring.
 * Returns true if value does NOT contain the substring (violation detected).
 *
 * @param value - The value to check
 * @param substring - The substring to search for
 * @returns true if value does not contain the substring
 */
export const does_not_contain: OperatorFn = (value: unknown, substring: unknown): boolean => {
  // Skip null/undefined - they trivially don't contain anything
  if (value === null || value === undefined) {
    return false;
  }

  return !contains(value, substring);
};

/**
 * Check if a value starts with a prefix.
 * Returns true if value starts with the prefix (violation detected).
 *
 * @param value - The value to check
 * @param prefix - The prefix to check for
 * @returns true if value starts with the prefix
 */
export const starts_with: OperatorFn = (value: unknown, prefix: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  const strValue = String(value);
  const strPrefix = String(prefix);

  return strValue.startsWith(strPrefix);
};

/**
 * Check if a value ends with a suffix.
 * Returns true if value ends with the suffix (violation detected).
 *
 * @param value - The value to check
 * @param suffix - The suffix to check for
 * @returns true if value ends with the suffix
 */
export const ends_with: OperatorFn = (value: unknown, suffix: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  const strValue = String(value);
  const strSuffix = String(suffix);

  return strValue.endsWith(strSuffix);
};

/**
 * Check if a value matches a regular expression pattern.
 * Returns true if value MATCHES the pattern (violation detected).
 *
 * @param value - The value to check
 * @param pattern - The regex pattern (string or RegExp)
 * @returns true if value matches the pattern
 */
export const matches_regex: OperatorFn = (value: unknown, pattern: unknown): boolean => {
  // Skip null/undefined
  if (value === null || value === undefined) {
    return false;
  }

  const strValue = String(value);

  try {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(String(pattern));
    return regex.test(strValue);
  } catch (error) {
    console.warn('matches_regex: Invalid regex pattern:', pattern);
    return false;
  }
};

/**
 * Check if a value does NOT match a regular expression pattern.
 * Returns true if value does NOT match the pattern (violation detected).
 *
 * @param value - The value to check
 * @param pattern - The regex pattern (string or RegExp)
 * @returns true if value does not match the pattern
 */
export const not_matches_regex: OperatorFn = (value: unknown, pattern: unknown): boolean => {
  // Skip null/undefined - they trivially don't match
  if (value === null || value === undefined) {
    return false;
  }

  return !matches_regex(value, pattern);
};
