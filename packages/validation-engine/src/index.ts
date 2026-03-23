/**
 * @sden99/validation-engine
 *
 * TypeScript validation engine for clinical data,
 * compatible with CDISC Rules Engine format.
 */

// =============================================================================
// Core Types
// =============================================================================

export type {
  // Rule types
  Rule,
  RuleAuthority,
  RuleStandard,
  RuleReference,
  ConditionComposite,
  AllCondition,
  AnyCondition,
  NotCondition,
  SingleCondition,
  Operation,

  // Result types
  ValidationResult,
  ValidationResultDetails,
  DatasetValidationSummary,

  // Data types
  DataRow,
  OperatorContext,

  // Operator types
  OperatorFn,
  OperatorDefinition,

  // Error types
  ValidationEngineError,

  // Define-XML types
  DefineVariableForValidation
} from './types';

// Type guards
export {
  isAllCondition,
  isAnyCondition,
  isNotCondition,
  isSingleCondition
} from './types';

// =============================================================================
// Rule Engine
// =============================================================================

export {
  validate,
  validateRule,
  validateWithSummary
} from './RuleEngine';

// =============================================================================
// Condition Evaluator
// =============================================================================

export {
  evaluateCondition,
  findFailingRows,
  evaluateWithDetails,
  getAndClearErrors,
  setCurrentRuleId
} from './ConditionEvaluator';

// =============================================================================
// Operators
// =============================================================================

export {
  getOperator,
  getOperatorDefinition,
  hasOperator,
  getOperatorNames,
  registerOperator,

  // Codelist operators
  is_contained_by,
  is_not_contained_by,

  // Null/Empty operators
  empty,
  non_empty,

  // Comparison operators
  equal_to,
  not_equal_to,
  greater_than,
  less_than,
  greater_than_or_equal_to,
  less_than_or_equal_to,

  // String operators
  contains,
  does_not_contain,
  starts_with,
  ends_with,
  matches_regex,
  not_matches_regex,

  // Length operators
  longer_than,
  shorter_than,
  has_equal_length,
  has_not_equal_length,
  length_in_range
} from './operators';

// =============================================================================
// Rule Generators
// =============================================================================

export {
  generateCodelistRules,
  generateLengthRules,
  generateTypeRules,
  generateRequiredRules,
  generateRulesFromDefine,
  convertDefineVariables
} from './adapters/DefineXmlRuleGenerator';

// =============================================================================
// YAML/JSON Import Utilities
// =============================================================================

export {
  cdiscToInternal,
  internalToCdisc
} from './utils/yamlFieldMapper';

export {
  validateImportedRule,
  type RuleImportIssue,
  type RuleValidationResult
} from './utils/ruleValidator';
