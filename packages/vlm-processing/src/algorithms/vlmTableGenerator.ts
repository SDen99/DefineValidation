/**
 * VLM Table Generation Algorithm
 * Supports both compact and expanded view modes
 *
 * Compact mode: PARAMCD-only rows, conditions collapsed into cell metadata
 * Expanded mode: Unified Cartesian rows - ALL VLM variables are considered together
 *                to create rows representing unique condition combinations per PARAMCD.
 *                Each cell shows the VLM definition that applies to that row's conditions.
 */

import type { ValueLevelMetadata } from '@sden99/data-processing';
import type { VLMMethod } from '@sden99/cdisc-types';
import { normalizeDatasetId } from '@sden99/dataset-domain';
import type {
	VLMTableData,
	VLMTableRow,
	EnhancedStratificationHierarchy,
	ParameterConditionCombo,
	GlobalStateProvider,
	VLMViewMode,
	DisplayCondition,
	ExpandableCondition,
	WhereClauseAnalysis,
	VLMComparator
} from '../types';

/**
 * Interface for tracking stratification dimension values
 */
interface StratificationDimension {
	variable: string;
	values: Set<string>; // All unique values found across VLM definitions
	hasNegativeConditions: boolean; // Has NE or NOTIN conditions
}

/**
 * Formats a condition for display
 */
export function formatConditionDisplay(comparator: VLMComparator | 'FORMAL', values: string[]): string {
	const valueStr = values.length === 1 ? values[0] : values.join(', ');
	switch (comparator) {
		case 'EQ':
			return `= ${valueStr}`;
		case 'NE':
			return `≠ ${valueStr}`;
		case 'IN':
			return values.length === 1 ? `= ${valueStr}` : `in (${valueStr})`;
		case 'NOTIN':
			return `not in (${valueStr})`;
		case 'LT':
			return `< ${valueStr}`;
		case 'LE':
			return `≤ ${valueStr}`;
		case 'GT':
			return `> ${valueStr}`;
		case 'GE':
			return `≥ ${valueStr}`;
		case 'FORMAL':
			return valueStr; // Raw expression
		default:
			return `${comparator} ${valueStr}`;
	}
}

/**
 * Analyzes a WhereClause to categorize conditions by expandability
 */
export function analyzeWhereClause(whereClause: any): WhereClauseAnalysis {
	const expandable: ExpandableCondition[] = [];
	const nonExpandable: DisplayCondition[] = [];
	let hasUnparseableConditions = false;

	if (!whereClause?.conditions) {
		return { expandable, nonExpandable, hasUnparseableConditions };
	}

	whereClause.conditions.forEach((condition: any) => {
		const variable = condition.variable;
		const comparator = condition.comparator as VLMComparator;
		const values = condition.checkValues || [];

		// EQ and IN are expandable (can create discrete rows)
		if (comparator === 'EQ' || comparator === 'IN') {
			expandable.push({ variable, comparator, values });
		} else {
			// NE, NOTIN, range comparators cannot be expanded
			nonExpandable.push({
				variable,
				comparator,
				values,
				displayText: formatConditionDisplay(comparator, values)
			});
		}
	});

	return { expandable, nonExpandable, hasUnparseableConditions };
}

/**
 * Generates enhanced transposed VLM table from processed variables
 * @param viewMode - 'compact' for PARAMCD-only rows, 'expanded' for full Cartesian expansion
 *
 * EXPANDED MODE ALGORITHM:
 * 1. Group ALL VLM definitions by PARAMCD
 * 2. For each PARAMCD, discover ALL stratification dimensions across ALL variables
 * 3. Generate unified rows for each unique combination of stratification values
 * 4. For each cell (row × variable), find the VLM definition whose conditions match
 * 5. Show empty cell if no definition matches
 */
export function generateEnhancedTransposedVLMTable(
	vlmScopedVariables: ValueLevelMetadata[],
	paramcdMapping: Record<string, string>,
	hierarchy: EnhancedStratificationHierarchy,
	stateProvider: GlobalStateProvider,
	viewMode: VLMViewMode = 'compact'
): VLMTableData {
	const vlmVariableNames = new Set(['PARAMCD', 'PARAM']);
	const stratificationColumns: Record<string, boolean> = {};
	const rowsMap: Record<string, VLMTableRow> = {};

	// Collect all variable names
	vlmScopedVariables.forEach((vlm) => {
		vlmVariableNames.add(vlm.variable.name);
	});

	// Track row counts for both modes
	let compactRowKeys = new Set<string>();
	let expandedRowKeys = new Set<string>();

	if (viewMode === 'expanded') {
		// ============================================
		// EXPANDED MODE: Cross-variable Cartesian expansion
		// ============================================

		// Step 1: Group ALL VLM definitions by PARAMCD
		const vlmByParamcd = groupVLMByParamcd(vlmScopedVariables, paramcdMapping);

		console.log('[vlmTableGenerator EXPANDED] paramcdMapping:', Object.keys(paramcdMapping));
		console.log('[vlmTableGenerator EXPANDED] vlmByParamcd keys:', Object.keys(vlmByParamcd));

		// Step 2 & 3: For each PARAMCD, discover dimensions and generate unified rows
		Object.entries(vlmByParamcd).forEach(([paramcd, paramcdVLMs]) => {
			const paramDescription = paramcdMapping[paramcd] || paramcd;
			compactRowKeys.add(paramcd);

			// Discover ALL stratification dimensions from ALL VLM definitions for this PARAMCD
			const dimensions = discoverStratificationDimensions(paramcdVLMs);

			console.log(`[vlmTableGenerator EXPANDED] ${paramcd}: discovered ${dimensions.length} dimensions:`,
				dimensions.map(d => ({ variable: d.variable, values: Array.from(d.values) })));

			// Mark stratification columns
			dimensions.forEach((dim) => {
				stratificationColumns[dim.variable] = true;
			});

			// Generate all unique row combinations for this PARAMCD
			const rowCombinations = generateRowCombinations(paramcd, dimensions);

			console.log(`[vlmTableGenerator EXPANDED] ${paramcd}: generated ${rowCombinations.length} row combinations, first:`, rowCombinations[0]);

			// Create rows and populate cells
			rowCombinations.forEach((combo) => {
				const rowKey = combo.rowKey;
				expandedRowKeys.add(rowKey);

				// Create row if it doesn't exist
				if (!rowsMap[rowKey]) {
					rowsMap[rowKey] = {
						rowKey,
						PARAMCD: paramcd,
						PARAM: paramDescription
					} as VLMTableRow;

					// Add stratification values as columns
					Object.entries(combo.values).forEach(([variable, value]) => {
						(rowsMap[rowKey] as any)[variable] = value;
					});

					// Debug: Log the created row
					console.log(`[vlmTableGenerator EXPANDED] Created row ${rowKey}:`,
						{ ...rowsMap[rowKey] });
				}

				// Step 4: For each variable, find matching VLM definition
			// Exclude PARAMCD, PARAM, and stratification dimension variables
			// (stratification dimensions become row values, not column cells)
			const stratificationVariables = new Set(dimensions.map(d => d.variable));
			const variableNames = Array.from(vlmVariableNames).filter(
				(v) => v !== 'PARAMCD' && v !== 'PARAM' && !stratificationVariables.has(v)
			);

				variableNames.forEach((variableName) => {
					// Find VLM definitions for this variable that apply to this PARAMCD
					const variableVLMs = paramcdVLMs.filter((vlm) => vlm.variable.name === variableName);

					// Find the VLM definition that matches this row's conditions
					const matchingVLM = findMatchingVLM(variableVLMs, combo.values, paramcd);

					if (matchingVLM) {
						const cellData = createEnhancedVLMCellData(
							matchingVLM,
							{
								paramcd,
								paramDescription,
								rowKey,
								stratificationValues: combo.values,
								conditionalMetadata: {},
								secondaryConditions: {}
							},
							stateProvider
						);
						(rowsMap[rowKey] as any)[variableName] = cellData;
					}
					// If no match, leave cell empty (undefined)
				});
			});
		});
	} else {
		// ============================================
		// COMPACT MODE: Original algorithm (one row per PARAMCD)
		// ============================================
		const vlmByVariable: Record<string, ValueLevelMetadata[]> = {};

		vlmScopedVariables.forEach((vlm) => {
			const varName = vlm.variable.name;
			if (!vlmByVariable[varName]) vlmByVariable[varName] = [];
			vlmByVariable[varName].push(vlm);
		});

		Object.entries(vlmByVariable).forEach(([variableName, vlmDefinitions]) => {
			vlmDefinitions.forEach((vlm) => {
				const paramConditionCombos = getEnhancedParameterConditionCombinations(
					vlm,
					paramcdMapping,
					hierarchy,
					viewMode
				);

				paramConditionCombos.forEach((combo) => {
					compactRowKeys.add(combo.paramcd);
					expandedRowKeys.add(combo.rowKey);

					let row = rowsMap[combo.rowKey];
					if (!row) {
						row = {
							rowKey: combo.rowKey,
							PARAMCD: combo.paramcd,
							PARAM: combo.paramDescription
						} as VLMTableRow;

						Object.entries(combo.stratificationValues).forEach(([variable, value]) => {
							stratificationColumns[variable] = true;
							(row as any)[variable] = value;
						});

						if (combo.stratificationConditions && Object.keys(combo.stratificationConditions).length > 0) {
							row.stratificationConditions = combo.stratificationConditions;
						}

						rowsMap[combo.rowKey] = row;
					}

					if (variableName !== 'PARAMCD' && variableName !== 'PARAM') {
						const newCellData = createEnhancedVLMCellData(vlm, combo, stateProvider);

						const existingCell = (row as any)[variableName];
						if (existingCell) {
							if (Array.isArray(existingCell)) {
								existingCell.push(newCellData);
							} else {
								(row as any)[variableName] = [existingCell, newCellData];
							}
						} else {
							(row as any)[variableName] = newCellData;
						}
					}
				});
			});
		});
	}

	// Sort rows
	const rows = Object.values(rowsMap).sort((a, b) => {
		const paramcdCompare = String(a.PARAMCD || '').localeCompare(String(b.PARAMCD || ''));
		return paramcdCompare !== 0 ? paramcdCompare : a.rowKey.localeCompare(b.rowKey);
	});

	// Build column list
	const allColumns = Array.from(vlmVariableNames);
	Object.keys(stratificationColumns).forEach((col) => {
		if (!allColumns.includes(col)) allColumns.push(col);
	});

	return {
		columns: allColumns,
		rows,
		stratificationColumns: new Set(Object.keys(stratificationColumns)),
		viewMode,
		compactRowCount: compactRowKeys.size,
		expandedRowCount: expandedRowKeys.size,
		isAmbiguous: hierarchy.isAmbiguous,
		ambiguityReason: hierarchy.ambiguityReason,
		dominantVariable: hierarchy.dominantVariable,
		stratificationCoverage: hierarchy.stratificationCoverage
	};
}

/**
 * Groups VLM definitions by the PARAMCD(s) they apply to
 */
function groupVLMByParamcd(
	vlmDefinitions: ValueLevelMetadata[],
	paramcdMapping: Record<string, string>
): Record<string, ValueLevelMetadata[]> {
	const result: Record<string, ValueLevelMetadata[]> = {};
	const allParamcds = Object.keys(paramcdMapping);

	vlmDefinitions.forEach((vlm) => {
		const targetParamcds = getTargetParamcds(vlm, allParamcds);

		targetParamcds.forEach((paramcd) => {
			if (!result[paramcd]) result[paramcd] = [];
			result[paramcd].push(vlm);
		});
	});

	return result;
}

/**
 * Gets the PARAMCD(s) that a VLM definition applies to
 */
function getTargetParamcds(vlm: ValueLevelMetadata, allParamcds: string[]): string[] {
	if (!vlm.whereClause?.conditions) {
		return allParamcds;
	}

	const paramcdCondition = vlm.whereClause.conditions.find(
		(c: any) => c.variable === 'PARAMCD'
	);

	if (!paramcdCondition) {
		return allParamcds;
	}

	const comparator = paramcdCondition.comparator;
	const values = paramcdCondition.checkValues || [];

	if (comparator === 'EQ' || comparator === 'IN') {
		return values.filter((v: string) => allParamcds.includes(v));
	} else if (comparator === 'NE' || comparator === 'NOTIN') {
		return allParamcds.filter((p) => !values.includes(p));
	}

	return allParamcds;
}

/**
 * Discovers all stratification dimensions from a set of VLM definitions
 * Only includes expandable dimensions (EQ/IN conditions)
 */
function discoverStratificationDimensions(
	vlmDefinitions: ValueLevelMetadata[]
): StratificationDimension[] {
	const dimensionMap = new Map<string, StratificationDimension>();

	vlmDefinitions.forEach((vlm) => {
		if (!vlm.whereClause?.conditions) return;

		vlm.whereClause.conditions.forEach((condition: any) => {
			const variable = condition.variable;
			// Skip PARAMCD - it's already used for grouping
			if (variable === 'PARAMCD') return;

			const comparator = condition.comparator;
			const values = condition.checkValues || [];

			if (!dimensionMap.has(variable)) {
				dimensionMap.set(variable, {
					variable,
					values: new Set(),
					hasNegativeConditions: false
				});
			}

			const dim = dimensionMap.get(variable)!;

			if (comparator === 'EQ' || comparator === 'IN') {
				// Add discrete values that can be expanded
				values.forEach((v: string) => dim.values.add(v));
			} else if (comparator === 'NE' || comparator === 'NOTIN') {
				dim.hasNegativeConditions = true;
				// For NE/NOTIN, we can't expand but track the values for matching
			}
		});
	});

	// Convert to array, filter out dimensions with no expandable values
	return Array.from(dimensionMap.values()).filter((dim) => dim.values.size > 0);
}

/**
 * Generates all row combinations for a PARAMCD based on discovered dimensions
 */
function generateRowCombinations(
	paramcd: string,
	dimensions: StratificationDimension[]
): Array<{ rowKey: string; values: Record<string, string> }> {
	if (dimensions.length === 0) {
		// No stratification - just one row for this PARAMCD
		return [{ rowKey: paramcd, values: {} }];
	}

	// Generate Cartesian product of all dimension values
	function cartesian(
		dims: StratificationDimension[],
		current: Record<string, string> = {}
	): Array<Record<string, string>> {
		if (dims.length === 0) {
			return [current];
		}

		const [first, ...rest] = dims;
		const results: Array<Record<string, string>> = [];

		first.values.forEach((value) => {
			const newCurrent = { ...current, [first.variable]: value };
			results.push(...cartesian(rest, newCurrent));
		});

		return results;
	}

	const combinations = cartesian(dimensions);

	return combinations.map((values) => {
		// Build row key from PARAMCD and sorted stratification values
		const sortedEntries = Object.entries(values).sort(([a], [b]) => a.localeCompare(b));
		const keyParts = [paramcd];
		sortedEntries.forEach(([variable, value]) => {
			keyParts.push(`${variable}:${value}`);
		});

		return {
			rowKey: keyParts.join('|'),
			values
		};
	});
}

/**
 * Finds the VLM definition that matches the given row's stratification values
 * Returns null if no definition matches
 */
function findMatchingVLM(
	variableVLMs: ValueLevelMetadata[],
	rowValues: Record<string, string>,
	paramcd: string
): ValueLevelMetadata | null {
	for (const vlm of variableVLMs) {
		if (vlmMatchesRow(vlm, rowValues, paramcd)) {
			return vlm;
		}
	}
	return null;
}

/**
 * Checks if a VLM definition's conditions match a row's stratification values
 *
 * Matching rules:
 * - EQ: row value must equal the check value
 * - NE: row value must NOT equal the check value
 * - IN: row value must be in the check values list
 * - NOTIN: row value must NOT be in the check values list
 * - If a VLM has no condition for a dimension, it matches any value
 */
function vlmMatchesRow(
	vlm: ValueLevelMetadata,
	rowValues: Record<string, string>,
	paramcd: string
): boolean {
	if (!vlm.whereClause?.conditions) {
		// No conditions = applies to all
		return true;
	}

	for (const condition of vlm.whereClause.conditions) {
		const variable = condition.variable;
		const comparator = condition.comparator;
		const checkValues = condition.checkValues || [];

		// Handle PARAMCD condition (should already be filtered, but double-check)
		if (variable === 'PARAMCD') {
			if (!conditionMatches(comparator, checkValues, paramcd)) {
				return false;
			}
			continue;
		}

		// For other variables, check against row values
		const rowValue = rowValues[variable];

		// If the row doesn't have a value for this dimension but the VLM has a condition,
		// we need to check if the VLM is applicable
		if (rowValue === undefined) {
			// VLM has a condition for a dimension the row doesn't have
			// This can happen when dimensions aren't fully crossed
			// For now, we treat this as a non-match
			continue;
		}

		if (!conditionMatches(comparator, checkValues, rowValue)) {
			return false;
		}
	}

	return true;
}

/**
 * Checks if a condition matches a value based on comparator
 */
function conditionMatches(comparator: string, checkValues: string[], value: string): boolean {
	switch (comparator) {
		case 'EQ':
			return checkValues.includes(value);
		case 'NE':
			return !checkValues.includes(value);
		case 'IN':
			return checkValues.includes(value);
		case 'NOTIN':
			return !checkValues.includes(value);
		case 'LT':
		case 'LE':
		case 'GT':
		case 'GE':
			// Range comparators - for now, assume numeric and do basic comparison
			const numValue = parseFloat(value);
			const numCheck = parseFloat(checkValues[0]);
			if (isNaN(numValue) || isNaN(numCheck)) return true; // Can't compare, assume match
			switch (comparator) {
				case 'LT':
					return numValue < numCheck;
				case 'LE':
					return numValue <= numCheck;
				case 'GT':
					return numValue > numCheck;
				case 'GE':
					return numValue >= numCheck;
			}
			return true;
		default:
			return true; // Unknown comparator, assume match
	}
}

/**
 * Extended ParameterConditionCombo with stratification condition display info
 */
interface ExtendedParameterConditionCombo extends ParameterConditionCombo {
	stratificationConditions?: Record<string, DisplayCondition>;
}

/**
 * Gets enhanced parameter condition combinations for a VLM variable
 */
export function getEnhancedParameterConditionCombinations(
	vlm: ValueLevelMetadata,
	paramcdMapping: Record<string, string>,
	hierarchy: EnhancedStratificationHierarchy,
	viewMode: VLMViewMode = 'compact'
): ExtendedParameterConditionCombo[] {
	const combinations: ExtendedParameterConditionCombo[] = [];

	if (Object.keys(paramcdMapping).length === 0) return combinations;

	if (!vlm.whereClause) {
		// No WhereClause - applies to all PARAMCDs
		Object.entries(paramcdMapping).forEach(([paramcd, paramDescription]) => {
			combinations.push({
				paramcd,
				paramDescription,
				rowKey: paramcd,
				stratificationValues: {},
				secondaryConditions: {}
			});
		});
	} else {
		const whereResult = processEnhancedWhereClause(vlm.whereClause, paramcdMapping, hierarchy, viewMode);
		combinations.push(...whereResult.parameterCombinations);
	}

	return combinations;
}

/**
 * Processes enhanced where clause to extract parameter combinations
 * In expanded mode, creates separate rows for each condition combination
 */
export function processEnhancedWhereClause(
	whereClause: any,
	paramcdMapping: Record<string, string>,
	hierarchy: EnhancedStratificationHierarchy,
	viewMode: VLMViewMode = 'compact'
): { parameterCombinations: ExtendedParameterConditionCombo[] } {
	const { primary } = hierarchy;
	const parameterCombinations: ExtendedParameterConditionCombo[] = [];

	// Analyze conditions
	const analysis = analyzeWhereClause(whereClause);

	// Extract PARAMCD values
	let targetParamcds: string[] = [];
	let paramcdCondition: any = null;

	whereClause.conditions.forEach((condition: any) => {
		if (condition.variable === 'PARAMCD') {
			paramcdCondition = condition;
			if (condition.comparator === 'EQ' || condition.comparator === 'IN') {
				targetParamcds.push(...condition.checkValues);
			} else if (condition.comparator === 'NE' || condition.comparator === 'NOTIN') {
				// For NE/NOTIN, filter out the excluded values
				targetParamcds = Object.keys(paramcdMapping).filter(
					(paramcd) => !condition.checkValues.includes(paramcd)
				);
			}
		}
	});

	if (targetParamcds.length === 0) {
		targetParamcds = Object.keys(paramcdMapping);
	}

	// Categorize non-PARAMCD conditions
	const primaryConditions: Record<string, { comparator: string; values: string[] }> = {};
	const secondaryConditions: Record<string, { comparator: string; values: string[] }> = {};

	whereClause.conditions.forEach((condition: any) => {
		const variable = condition.variable;
		if (variable === 'PARAMCD') return;

		const conditionData = {
			comparator: condition.comparator,
			values: condition.checkValues
		};

		if (primary.includes(variable)) {
			primaryConditions[variable] = conditionData;
		} else {
			secondaryConditions[variable] = conditionData;
		}
	});

	if (viewMode === 'expanded') {
		// EXPANDED MODE: Create rows for each PARAMCD × primary condition value combination
		// This creates Cartesian product rows for expandable conditions (EQ, IN)
		// Non-expandable conditions (NE, NOTIN, ranges) become display text

		// Separate expandable and non-expandable primary conditions
		const expandableConditions: Array<{ variable: string; values: string[] }> = [];
		const nonExpandableConditions: Array<{ variable: string; comparator: VLMComparator; values: string[] }> = [];

		Object.entries(primaryConditions).forEach(([variable, condInfo]) => {
			const comparator = condInfo.comparator as VLMComparator;
			if (comparator === 'EQ' || comparator === 'IN') {
				// EQ and IN can be expanded to discrete rows
				expandableConditions.push({ variable, values: condInfo.values });
			} else {
				// NE, NOTIN, ranges cannot be expanded
				nonExpandableConditions.push({ variable, comparator, values: condInfo.values });
			}
		});

		// Generate all combinations of expandable condition values (Cartesian product)
		function generateCombinations(
			conditions: Array<{ variable: string; values: string[] }>
		): Array<Record<string, string>> {
			if (conditions.length === 0) return [{}];

			const [first, ...rest] = conditions;
			const restCombinations = generateCombinations(rest);

			const result: Array<Record<string, string>> = [];
			first.values.forEach((value) => {
				restCombinations.forEach((combo) => {
					result.push({ ...combo, [first.variable]: value });
				});
			});
			return result;
		}

		const expandedCombinations = generateCombinations(expandableConditions);

		targetParamcds.forEach((paramcd) => {
			const paramDescription = paramcdMapping[paramcd] || paramcd;

			// Create a row for each expanded combination
			expandedCombinations.forEach((expandedValues) => {
				const stratificationValues: Record<string, string> = { ...expandedValues };
				const stratificationConditions: Record<string, DisplayCondition> = {};

				// Add expanded condition displays
				Object.entries(expandedValues).forEach(([variable, value]) => {
					stratificationConditions[variable] = {
						variable,
						comparator: 'EQ',
						values: [value],
						displayText: value // Just show the value for expanded rows
					};
				});

				// Add non-expandable conditions as display text
				nonExpandableConditions.forEach(({ variable, comparator, values }) => {
					const displayText = formatConditionDisplay(comparator, values);
					stratificationValues[variable] = displayText;
					stratificationConditions[variable] = {
						variable,
						comparator,
						values,
						displayText
					};
				});

				// Build row key including all stratification values
				const rowKeyParts = [paramcd];
				Object.entries(stratificationValues)
					.sort(([a], [b]) => a.localeCompare(b))
					.forEach(([variable, value]) => {
						rowKeyParts.push(`${variable}:${value}`);
					});
				const rowKey = rowKeyParts.join('|');

				// Build conditional metadata for this specific combination
				const conditionalMetadata: Record<string, { comparator: string; values: string[] }> = {};
				Object.entries(expandedValues).forEach(([variable, value]) => {
					conditionalMetadata[variable] = { comparator: 'EQ', values: [value] };
				});
				nonExpandableConditions.forEach(({ variable, comparator, values }) => {
					conditionalMetadata[variable] = { comparator, values };
				});

				parameterCombinations.push({
					paramcd,
					paramDescription,
					rowKey,
					stratificationValues,
					stratificationConditions,
					conditionalMetadata,
					secondaryConditions
				});
			});
		});
	} else {
		// COMPACT MODE: One row per PARAMCD, conditions as cell metadata
		targetParamcds.forEach((paramcd) => {
			const paramDescription = paramcdMapping[paramcd] || paramcd;
			const rowKey = paramcd;

			const conditionalMetadata: Record<string, { comparator: string; values: string[] }> = {};
			Object.entries(primaryConditions).forEach(([variable, condition]) => {
				conditionalMetadata[variable] = condition;
			});

			parameterCombinations.push({
				paramcd,
				paramDescription,
				rowKey,
				stratificationValues: {},
				conditionalMetadata,
				secondaryConditions
			});
		});
	}

	return { parameterCombinations };
}

/**
 * Creates enhanced VLM cell data with method and condition information
 */
export function createEnhancedVLMCellData(
	vlm: ValueLevelMetadata,
	combo: ExtendedParameterConditionCombo,
	stateProvider: GlobalStateProvider
): any {
	const enhancedVLM = enhanceVLMWithMethod(vlm, stateProvider);

	// Combine all conditions (primary + secondary)
	const allConditions = {
		...combo.conditionalMetadata,
		...combo.secondaryConditions
	};
	const hasConditions = Object.keys(allConditions).length > 0;

	const cellData = {
		variable: enhancedVLM.variable,
		method: enhancedVLM.method,
		whereClause: enhancedVLM.whereClause,
		codeList: enhancedVLM.codeList,
		comments: enhancedVLM.comments,
		origin: enhancedVLM.variable.origin,
		methodOID: enhancedVLM.methodOID,
		whereClauseOID: enhancedVLM.whereClauseOID,
		commentOID: enhancedVLM.commentOID,
		conditions: allConditions,
		hasVariations: hasConditions,
		_debug: {
			variableName: vlm.variable.name,
			paramcd: combo.paramcd,
			rowKey: combo.rowKey
		}
	};

	// Add condition description to method for display
	if (cellData.hasVariations && cellData.method) {
		const conditionDesc = Object.entries(allConditions)
			.map(([variable, info]) => `${variable}${formatConditionDisplay(info.comparator as VLMComparator, info.values)}`)
			.join(', ');

		cellData.method = {
			...cellData.method,
			Description:
				(cellData.method.Description || '') +
				(conditionDesc ? ` (when ${conditionDesc})` : ''),
			hasConditions: true,
			conditionsText: conditionDesc
		} as VLMMethod;
	}

	return cellData;
}

/**
 * Formats stratification value for display (legacy function for compatibility)
 */
export function formatStratificationValue(info: { comparator: string; values: string[] }): string {
	return formatConditionDisplay(info.comparator as VLMComparator, info.values);
}

/**
 * Enhances VLM with method information from define data
 */
export function enhanceVLMWithMethod(
	vlm: ValueLevelMetadata,
	stateProvider: GlobalStateProvider
): ValueLevelMetadata {
	const { SDTM, ADaM, sdtmId, adamId } = stateProvider.getDefineXmlInfo();
	const name = stateProvider.getSelectedDomain() || stateProvider.getSelectedDatasetId();
	if (!name) return vlm;

	const normalizedName = normalizeDatasetId(name);
	let defineFileId: string | null = null;

	if (ADaM?.ItemGroups.some((g: any) => normalizeDatasetId(g.SASDatasetName || g.Name) === normalizedName)) {
		defineFileId = adamId;
	} else if (
		SDTM?.ItemGroups.some((g: any) => normalizeDatasetId(g.SASDatasetName || g.Name) === normalizedName)
	) {
		defineFileId = sdtmId;
	}

	if (!defineFileId) return vlm;

	const defineDataset = stateProvider.getDatasets()[defineFileId];
	const enhancedDefine = defineDataset?.enhancedDefineXML;
	if (!enhancedDefine) return vlm;

	let enhanced = { ...vlm };

	if (vlm.methodOID && !vlm.method) {
		const methodDef = enhancedDefine.lookups.methodsByOID.get(vlm.methodOID);
		if (methodDef) {
			enhanced.method = {
				OID: methodDef.OID || '',
				Name: methodDef.Name || '',
				Description: methodDef.Description || '',
				Type: methodDef.Type,
				Document: methodDef.Document,
				Pages: methodDef.Pages,
				TranslatedText: methodDef.TranslatedText,
				hasSecondaryConditions: false,
				secondaryConditionsText: undefined
			} as VLMMethod;
		}
	}

	if (vlm.commentOID && (!vlm.comments || vlm.comments.length === 0)) {
		const commentDef = enhancedDefine.lookups.commentsByOID.get(vlm.commentOID);
		if (commentDef) {
			enhanced.comments = [
				{ oid: commentDef.OID || '', description: commentDef.Description || '' }
			];
		}
	}

	return enhanced;
}
