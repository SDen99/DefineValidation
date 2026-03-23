/**
 * Condition Evaluator
 *
 * Evaluates condition composites (all/any/not/single) against data rows.
 * Returns true if the row FAILS validation (has an issue).
 */

import type {
  ConditionComposite,
  SingleCondition,
  DataRow,
  OperatorContext,
  ValidationEngineError
} from './types';
import {
  isAllCondition,
  isAnyCondition,
  isNotCondition,
  isSingleCondition
} from './types';
import { getOperator } from './operators';

// =============================================================================
// Error Collector
//
// Module-level collector that accumulates engine errors during evaluation.
// Callers should call getAndClearErrors() after each rule evaluation pass.
// =============================================================================

let collectedErrors: ValidationEngineError[] = [];
let currentRuleId = '';

/**
 * Set the current rule ID for error attribution.
 * Call this before evaluating each rule.
 */
export function setCurrentRuleId(ruleId: string): void {
  currentRuleId = ruleId;
}

/**
 * Record an engine error encountered during condition evaluation.
 */
export function collectError(error: ValidationEngineError): void {
  collectedErrors.push(error);
}

/**
 * Retrieve all collected errors and reset the collector.
 * Call this after each rule evaluation to drain errors.
 */
export function getAndClearErrors(): ValidationEngineError[] {
  const errors = collectedErrors;
  collectedErrors = [];
  return errors;
}

/**
 * Evaluate a condition composite against a data row.
 *
 * Returns true if the row FAILS validation (the check condition is true).
 * Operators return true when their check condition is met (violation detected).
 * e.g., is_not_contained_by returns true when value is NOT in codelist.
 *
 * @param condition - The condition composite to evaluate
 * @param row - The data row to check
 * @param context - Additional context for operators
 * @returns true if the row FAILS validation (has an issue)
 */
export function evaluateCondition(
  condition: ConditionComposite,
  row: DataRow,
  context?: OperatorContext
): boolean {
  if (isAllCondition(condition)) {
    // ALL conditions must be true for the row to FAIL
    // (i.e., all conditions detect an issue)
    return condition.all.every((c) => evaluateCondition(c, row, context));
  }

  if (isAnyCondition(condition)) {
    // ANY condition can be true for the row to FAIL
    // (i.e., any condition detects an issue)
    return condition.any.some((c) => evaluateCondition(c, row, context));
  }

  if (isNotCondition(condition)) {
    // NOT inverts the result
    return !evaluateCondition(condition.not, row, context);
  }

  if (isSingleCondition(condition)) {
    return evaluateSingleCondition(condition, row, context);
  }

  // Unknown condition type
  console.warn('Unknown condition type:', condition);
  collectError({
    ruleId: currentRuleId,
    type: 'unknown_condition',
    message: `Unknown condition type: ${JSON.stringify(condition)}`
  });
  return false;
}

/**
 * Evaluate a single condition against a data row.
 *
 * @param condition - The single condition to evaluate
 * @param row - The data row to check
 * @param context - Additional context for operators
 * @returns true if the row FAILS validation (check condition is true)
 */
function evaluateSingleCondition(
  condition: SingleCondition,
  row: DataRow,
  context?: OperatorContext
): boolean {
  const { name, operator, value } = condition;

  // Get the value from the row
  const rowValue = row[name];

  // Get the operator function
  const operatorFn = getOperator(operator);

  if (!operatorFn) {
    console.warn(`Unknown operator: ${operator}`);
    collectError({
      ruleId: currentRuleId,
      type: 'unknown_operator',
      message: `Unknown operator "${operator}" for variable "${name}"`
    });
    return false;
  }

  // Execute the operator
  // Operators return true when the CHECK condition is TRUE (violation detected)
  // e.g., is_not_contained_by returns true when value is NOT in codelist
  const isViolation = operatorFn(rowValue, value, context);

  return isViolation;
}

/**
 * Evaluate a condition against all rows and return indices of failing rows.
 *
 * @param condition - The condition composite to evaluate
 * @param data - Array of data rows
 * @returns Array of row indices that FAIL validation
 */
export function findFailingRows(
  condition: ConditionComposite,
  data: DataRow[]
): number[] {
  const failingIndices: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const context: OperatorContext = {
      rowIndex: i,
      row
    };

    if (evaluateCondition(condition, row, context)) {
      failingIndices.push(i);
    }
  }

  return failingIndices;
}

/**
 * Evaluate a condition and collect details about failures.
 *
 * @param condition - The condition composite to evaluate
 * @param data - Array of data rows
 * @param primaryColumn - The primary column being checked (for value collection)
 * @returns Object with failing indices and value breakdown
 */
export function evaluateWithDetails(
  condition: ConditionComposite,
  data: DataRow[],
  primaryColumn: string
): {
  failingIndices: number[];
  invalidValues: Map<string, number>;
} {
  const failingIndices: number[] = [];
  const invalidValues = new Map<string, number>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const context: OperatorContext = {
      rowIndex: i,
      row
    };

    if (evaluateCondition(condition, row, context)) {
      failingIndices.push(i);

      // Track the invalid value
      const value = row[primaryColumn];
      const valueStr = value === null || value === undefined ? '(empty)' : String(value);
      invalidValues.set(valueStr, (invalidValues.get(valueStr) || 0) + 1);
    }
  }

  return { failingIndices, invalidValues };
}
