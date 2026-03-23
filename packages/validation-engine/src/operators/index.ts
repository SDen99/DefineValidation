/**
 * Operator Registry
 *
 * Central registry for all validation operators.
 * Operators can be looked up by name for dynamic rule evaluation.
 */

import type { OperatorFn, OperatorDefinition } from '../types';
import { is_contained_by, is_not_contained_by } from './codelist';
import { empty, non_empty } from './nullEmpty';
import {
  equal_to,
  not_equal_to,
  greater_than,
  less_than,
  greater_than_or_equal_to,
  less_than_or_equal_to
} from './comparison';
import {
  contains,
  does_not_contain,
  starts_with,
  ends_with,
  matches_regex,
  not_matches_regex
} from './string';
import {
  longer_than,
  shorter_than,
  has_equal_length,
  has_not_equal_length,
  length_in_range
} from './length';

// =============================================================================
// Operator Definitions
//
// Convention: Operators return true when a VIOLATION is detected (the check
// condition is met). For example, is_not_contained_by returns true when a
// value is NOT in the codelist, and `empty` returns true when a value IS empty.
//
// Exception: is_contained_by is a helper that returns true when the value IS
// in the list (no violation). It exists to be negated by is_not_contained_by.
// =============================================================================

const operatorDefinitions: OperatorDefinition[] = [
  // Codelist operators
  {
    name: 'is_contained_by',
    description: 'Check if value is in the allowed codelist',
    fn: is_contained_by,
    requiresValue: true
  },
  {
    name: 'is_not_contained_by',
    description: 'Check if value is NOT in the allowed codelist (violation)',
    fn: is_not_contained_by,
    requiresValue: true
  },

  // Null/Empty operators
  {
    name: 'empty',
    description: 'Check if value is empty (null, undefined, or empty string)',
    fn: empty,
    requiresValue: false
  },
  {
    name: 'non_empty',
    description: 'Check if value is non-empty',
    fn: non_empty,
    requiresValue: false
  },

  // Comparison operators
  {
    name: 'equal_to',
    description: 'Check if value equals the expected value',
    fn: equal_to,
    requiresValue: true
  },
  {
    name: 'not_equal_to',
    description: 'Check if value does not equal the expected value',
    fn: not_equal_to,
    requiresValue: true
  },
  {
    name: 'greater_than',
    description: 'Check if numeric value is greater than threshold',
    fn: greater_than,
    requiresValue: true
  },
  {
    name: 'less_than',
    description: 'Check if numeric value is less than threshold',
    fn: less_than,
    requiresValue: true
  },
  {
    name: 'greater_than_or_equal_to',
    description: 'Check if numeric value is greater than or equal to threshold',
    fn: greater_than_or_equal_to,
    requiresValue: true
  },
  {
    name: 'less_than_or_equal_to',
    description: 'Check if numeric value is less than or equal to threshold',
    fn: less_than_or_equal_to,
    requiresValue: true
  },

  // String operators
  {
    name: 'contains',
    description: 'Check if value contains a substring',
    fn: contains,
    requiresValue: true
  },
  {
    name: 'does_not_contain',
    description: 'Check if value does not contain a substring',
    fn: does_not_contain,
    requiresValue: true
  },
  {
    name: 'starts_with',
    description: 'Check if value starts with a prefix',
    fn: starts_with,
    requiresValue: true
  },
  {
    name: 'ends_with',
    description: 'Check if value ends with a suffix',
    fn: ends_with,
    requiresValue: true
  },
  {
    name: 'matches_regex',
    description: 'Check if value matches a regular expression pattern',
    fn: matches_regex,
    requiresValue: true
  },
  {
    name: 'not_matches_regex',
    description: 'Check if value does not match a regular expression pattern',
    fn: not_matches_regex,
    requiresValue: true
  },

  // Length operators
  {
    name: 'longer_than',
    description: 'Check if value length is greater than maximum',
    fn: longer_than,
    requiresValue: true
  },
  {
    name: 'shorter_than',
    description: 'Check if value length is less than minimum',
    fn: shorter_than,
    requiresValue: true
  },
  {
    name: 'has_equal_length',
    description: 'Check if value has the exact expected length',
    fn: has_equal_length,
    requiresValue: true
  },
  {
    name: 'has_not_equal_length',
    description: 'Check if value does not have the expected length',
    fn: has_not_equal_length,
    requiresValue: true
  },
  {
    name: 'length_in_range',
    description: 'Check if value length is within a range [min, max]',
    fn: length_in_range,
    requiresValue: true
  }
];

// =============================================================================
// Operator Registry
// =============================================================================

/** Map of operator name to operator function */
const operatorRegistry = new Map<string, OperatorFn>();

/** Map of operator name to full definition */
const definitionRegistry = new Map<string, OperatorDefinition>();

// Initialize registries
for (const def of operatorDefinitions) {
  operatorRegistry.set(def.name, def.fn);
  definitionRegistry.set(def.name, def);
}

/**
 * Get an operator function by name
 * @param name - The operator name (e.g., 'is_not_contained_by')
 * @returns The operator function, or undefined if not found
 */
export function getOperator(name: string): OperatorFn | undefined {
  return operatorRegistry.get(name);
}

/**
 * Get an operator definition by name
 * @param name - The operator name
 * @returns The full operator definition, or undefined if not found
 */
export function getOperatorDefinition(name: string): OperatorDefinition | undefined {
  return definitionRegistry.get(name);
}

/**
 * Check if an operator exists
 * @param name - The operator name
 * @returns true if operator is registered
 */
export function hasOperator(name: string): boolean {
  return operatorRegistry.has(name);
}

/**
 * Get all registered operator names
 * @returns Array of operator names
 */
export function getOperatorNames(): string[] {
  return Array.from(operatorRegistry.keys());
}

/**
 * Register a custom operator
 * @param definition - The operator definition to register
 */
export function registerOperator(definition: OperatorDefinition): void {
  operatorRegistry.set(definition.name, definition.fn);
  definitionRegistry.set(definition.name, definition);
}

// Re-export individual operators for direct use
export { is_contained_by, is_not_contained_by } from './codelist';
export { empty, non_empty } from './nullEmpty';
export {
  equal_to,
  not_equal_to,
  greater_than,
  less_than,
  greater_than_or_equal_to,
  less_than_or_equal_to
} from './comparison';
export {
  contains,
  does_not_contain,
  starts_with,
  ends_with,
  matches_regex,
  not_matches_regex
} from './string';
export {
  longer_than,
  shorter_than,
  has_equal_length,
  has_not_equal_length,
  length_in_range
} from './length';
