/**
 * Core type definitions for the validation engine.
 * Compatible with CDISC Rules Engine YAML/JSON format.
 */

// =============================================================================
// Rule Definition Types
// =============================================================================

/**
 * CDISC Authorities section — identifies the source and standard for a rule
 */
export interface RuleAuthority {
  Organization: string;
  Standards: RuleStandard[];
}

export interface RuleStandard {
  Name: string;
  Version: string;
  References: RuleReference[];
}

export interface RuleReference {
  Rule_Identifier: { Id: string; Version: string };
  Origin: string;
  Version: string;
}

/**
 * A validation rule definition (CDISC-compatible format)
 */
export interface Rule {
  /** Core rule metadata */
  Core: {
    /** Unique rule identifier (e.g., "AUTO.CODELIST.SEX") */
    Id: string;
    /** Rule version */
    Version: string;
    /** Rule status */
    Status: 'Draft' | 'Published';
  };

  /** CDISC Authorities — source and standard references (optional) */
  Authorities?: RuleAuthority[];

  /** Human-readable description of what the rule checks */
  Description: string;

  /** Granularity of validation issues */
  Sensitivity: 'Record' | 'Dataset' | 'Value';

  /** Whether the rule can be fully executed */
  Executability: 'Fully Executable' | 'Partially Executable';

  /** Category of rule */
  Rule_Type: string;

  /** Scope: which domains/classes this rule applies to */
  Scope?: {
    Classes?: {
      Include?: string[];
      Exclude?: string[];
    };
    Domains?: {
      Include?: string[];
      Exclude?: string[];
    };
  };

  /** Primary variable this rule targets (used for result aggregation) */
  Target_Variable?: string;

  /** The check logic (condition tree) */
  Check: ConditionComposite;

  /** Pre-processing operations (Phase 2+) */
  Operations?: Operation[];

  /** Output configuration */
  Outcome: {
    /** Error message template (can include $variable placeholders) */
    Message: string;
    /** Variables to include in output */
    Output_Variables?: string[];
  };
}

// =============================================================================
// Condition Types
// =============================================================================

/**
 * A condition composite - can be all/any/not or a single condition
 */
export type ConditionComposite =
  | AllCondition
  | AnyCondition
  | NotCondition
  | SingleCondition;

/** All conditions must be true (AND logic) */
export interface AllCondition {
  all: ConditionComposite[];
}

/** Any condition can be true (OR logic) */
export interface AnyCondition {
  any: ConditionComposite[];
}

/** Negation of a condition */
export interface NotCondition {
  not: ConditionComposite;
}

/** A single condition check */
export interface SingleCondition {
  /** Variable/column name to check */
  name: string;
  /** Operator to apply */
  operator: string;
  /** Expected value (optional for some operators like 'empty') */
  value?: unknown;
}

/**
 * Type guard for AllCondition
 */
export function isAllCondition(c: ConditionComposite): c is AllCondition {
  return 'all' in c;
}

/**
 * Type guard for AnyCondition
 */
export function isAnyCondition(c: ConditionComposite): c is AnyCondition {
  return 'any' in c;
}

/**
 * Type guard for NotCondition
 */
export function isNotCondition(c: ConditionComposite): c is NotCondition {
  return 'not' in c;
}

/**
 * Type guard for SingleCondition
 */
export function isSingleCondition(c: ConditionComposite): c is SingleCondition {
  return 'name' in c && 'operator' in c;
}

// =============================================================================
// Operation Types (Phase 2+)
// =============================================================================

/**
 * A pre-processing operation that runs before condition evaluation
 */
export interface Operation {
  /** Unique identifier for this operation result (starts with $) */
  id: string;
  /** Operation type */
  operator: string;
  /** Additional parameters depend on operator type */
  [key: string]: unknown;
}

// =============================================================================
// Validation Result Types
// =============================================================================

/**
 * Result of validating a single rule against data
 */
export interface ValidationResult {
  /** The rule that was evaluated */
  ruleId: string;

  /** The column this result applies to (primary column from rule) */
  columnId: string;

  /** Severity level */
  severity: 'error' | 'warning' | 'info';

  /** Number of issues found */
  issueCount: number;

  /** Row indices that have issues (for filtering) */
  affectedRows: number[];

  /** Human-readable summary message */
  message: string;

  /** Optional detailed breakdown */
  details?: ValidationResultDetails;
}

/**
 * Detailed breakdown of validation issues
 */
export interface ValidationResultDetails {
  /** Map of invalid values to their occurrence count */
  invalidValues?: Map<string, number>;

  /** The rule definition (for reference) */
  rule?: Rule;
}

/**
 * Aggregated validation results for a dataset
 */
export interface DatasetValidationSummary {
  /** Dataset identifier */
  datasetId: string;

  /** Total number of rules evaluated */
  rulesEvaluated: number;

  /** Number of rules that passed */
  rulesPassed: number;

  /** Number of rules that failed */
  rulesFailed: number;

  /** Results by column */
  resultsByColumn: Map<string, ValidationResult[]>;

  /** All results */
  allResults: ValidationResult[];

  /** Timestamp of validation */
  timestamp: Date;

  /** Engine errors encountered during evaluation (unknown operators, missing columns, etc.) */
  errors: ValidationEngineError[];
}

// =============================================================================
// Validation Engine Error Types
// =============================================================================

/**
 * An error encountered during rule evaluation that prevented proper validation.
 * These represent internal engine problems (unknown operators, missing columns),
 * NOT data validation failures.
 */
export interface ValidationEngineError {
  /** The rule that encountered the error */
  ruleId: string;
  /** Category of error */
  type: 'unknown_operator' | 'unknown_condition' | 'missing_column' | 'invalid_operand' | 'execution';
  /** Human-readable description */
  message: string;
}

// =============================================================================
// Data Types
// =============================================================================

/**
 * A row of data (generic record type)
 */
export type DataRow = Record<string, unknown>;

/**
 * Context passed to operators for additional information
 */
export interface OperatorContext {
  /** Current row index */
  rowIndex: number;

  /** Current row data */
  row: DataRow;

  /** Column metadata if available */
  columnMetadata?: Record<string, unknown>;
}

// =============================================================================
// Operator Types
// =============================================================================

/**
 * An operator function that evaluates a single condition.
 * Returns true if the check condition is met (violation detected),
 * false if the value is valid.
 */
export type OperatorFn = (
  value: unknown,
  expectedValue: unknown,
  context?: OperatorContext
) => boolean;

/**
 * Operator registry entry
 */
export interface OperatorDefinition {
  /** Operator name (e.g., 'equal_to') */
  name: string;

  /** Human-readable description */
  description: string;

  /** The operator function */
  fn: OperatorFn;

  /** Whether this operator requires a value parameter */
  requiresValue: boolean;
}

// =============================================================================
// Define-XML Integration Types
// =============================================================================

/**
 * Simplified variable definition from Define-XML (for rule generation)
 */
export interface DefineVariableForValidation {
  /** Variable name (e.g., "SEX") */
  name: string;

  /** Data type from Define-XML */
  dataType: string;

  /** Maximum length (if specified) */
  length?: number;

  /** Whether the variable is required */
  mandatory?: boolean;

  /** Codelist items (if variable has a codelist) */
  codelistItems?: {
    codedValue: string;
    decode?: string;
  }[];

  /** Domain this variable belongs to */
  domain?: string;
}
