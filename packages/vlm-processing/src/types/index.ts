/**
 * Core types for VLM processing and stratification analysis
 */

import type { VLMVariable, VLMItemRef, VLMMethod } from '@sden99/cdisc-types';
import type { ValueLevelMetadata } from '@sden99/data-processing';

/**
 * Stratification level for VLM analysis
 */
export interface StratificationLevel {
  id: string;
  condition: string;
  variables: string[];
  depth: number;
  parentId?: string;
  childIds: string[];
}

/**
 * Stratification hierarchy for complex VLM conditions
 */
export interface StratificationHierarchy {
  id: string;
  rootLevel: StratificationLevel;
  allLevels: Map<string, StratificationLevel>;
  maxDepth: number;
}

/**
 * Variable analysis result
 */
export interface VariableAnalysis {
  variableName: string;
  dataType: string;
  uniqueValues: number;
  missingCount: number;
  vlmConditions: string[];
  stratificationLevels: string[];
}

/**
 * VLM processing configuration
 */
export interface VLMProcessingConfig {
  enableStratification: boolean;
  maxStratificationDepth: number;
  includeEmptyConditions: boolean;
  preserveOriginalOrder: boolean;
}

/**
 * VLM processing result
 */
export interface VLMProcessingResult {
  processedVLMs: VLMVariable[];
  hierarchies: StratificationHierarchy[];
  variableAnalyses: VariableAnalysis[];
  processingStats: {
    totalVariables: number;
    vlmVariables: number;
    stratifiedVariables: number;
    processingTime: number;
  };
}

// ============================================
// VLM TABLE TYPES (migrated from vlmProcessingState.svelte.ts)
// ============================================

/**
 * VLM table view mode
 * - compact: PARAMCD-only rows, conditions collapsed into cell metadata (default)
 * - expanded: Full Cartesian rows with PARAMCD values expanded, secondary conditions as columns
 */
export type VLMViewMode = 'compact' | 'expanded';

/**
 * Comparator types from Define-XML RangeCheck
 */
export type VLMComparator = 'EQ' | 'NE' | 'IN' | 'NOTIN' | 'LT' | 'LE' | 'GT' | 'GE';

/**
 * Condition that can be expanded to discrete rows (EQ, IN with enumerable values)
 */
export interface ExpandableCondition {
	variable: string;
	comparator: 'EQ' | 'IN';
	values: string[];
}

/**
 * Condition that cannot be expanded - must be displayed as text
 * (NE, NOTIN, range comparators, FormalExpression)
 */
export interface DisplayCondition {
	variable: string;
	comparator: VLMComparator | 'FORMAL';
	values: string[];
	displayText: string; // Pre-formatted: "≠ AVERAGE", "not in (A, B)", "> 18", etc.
	rawExpression?: string; // Original FormalExpression if applicable
}

/**
 * Analyzed WhereClause with conditions categorized by expandability
 */
export interface WhereClauseAnalysis {
	expandable: ExpandableCondition[];
	nonExpandable: DisplayCondition[];
	hasUnparseableConditions: boolean;
}

/**
 * VLM table data structure for transposed view
 */
export interface VLMTableData {
	columns: string[];
	rows: VLMTableRow[];
	stratificationColumns: Set<string>;
	viewMode: VLMViewMode;
	compactRowCount: number; // Row count in compact mode
	expandedRowCount: number; // Row count if expanded (for preview)
	isAmbiguous?: boolean; // True when row structure cannot be definitively determined
	ambiguityReason?: string; // Explanation of why it's ambiguous
	dominantVariable?: string; // Most common stratification variable
	stratificationCoverage?: number; // % of ValueListDefs using dominant variable
}

/**
 * Row in VLM table with dynamic columns
 */
export interface VLMTableRow {
	rowKey: string;
	PARAMCD: string;
	PARAM: string;
	/**
	 * Secondary stratification conditions displayed as column values
	 * In expanded mode, these show the actual condition (e.g., "= AVERAGE", "≠ LOCF")
	 */
	stratificationConditions?: Record<string, DisplayCondition>;
	[variableName: string]: any;
}

/**
 * Enhanced stratification hierarchy with analysis
 */
export interface EnhancedStratificationHierarchy {
	primary: string[];
	secondary: string[];
	analysis: Record<
		string,
		{
			affectedVariables: number;
			totalDefinitions: number;
			impactScore: number;
		}
	>;
	isAmbiguous: boolean; // NEW: True when row structure cannot be definitively determined
	ambiguityReason?: string; // NEW: Explanation of why it's ambiguous
	dominantVariable?: string; // NEW: Most common stratification variable (if unambiguous)
	stratificationCoverage?: number; // NEW: % of ValueListDefs using dominant variable
}

/**
 * Parameter and condition combination for VLM processing
 */
export interface ParameterConditionCombo {
	paramcd: string;
	paramDescription: string;
	rowKey: string;
	stratificationValues: Record<string, string>;
	conditionalMetadata?: Record<string, { comparator: string; values: string[] }>; // NEW: Primary conditions as metadata
	secondaryConditions?: Record<string, { comparator: string; values: string[] }>;
	whereClauseText?: string;
}

/**
 * Enhanced VLM table data with hierarchy information
 */
export interface EnhancedVLMTableData extends VLMTableData {
	hierarchy?: EnhancedStratificationHierarchy;
}

/**
 * Dependency injection interface for global state access
 */
export interface GlobalStateProvider {
	getSelectedDomain: () => string | null;
	getSelectedDatasetId: () => string | null;
	getDefineXmlInfo: () => any;
	getDatasets: () => any;
}

// Re-export commonly used types from dependencies
export type { VLMVariable, VLMItemRef, VLMMethod } from '@sden99/cdisc-types';
export type { ValueLevelMetadata } from '@sden99/data-processing';