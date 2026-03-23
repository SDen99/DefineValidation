/**
 * VLM Table Transformation Utility
 *
 * Transforms ValueLevelMetadata into an editable table structure where:
 * - Parameters (PARAMCD + stratification) are ROWS
 * - Variables are COLUMNS
 * - Cells contain metadata references (Method, CodeList, WhereClause, Comment)
 *
 * Uses the proven generateEnhancedTransposedVLMTable from vlm-processing
 */

import type { ParsedDefineXML } from '@sden99/cdisc-types';
import type { ValueLevelMetadata } from '@sden99/data-processing';
import * as dataState from '$lib/core/state/dataState.svelte.ts';
import {
	extractParamcdMapping,
	detectVLMStratificationHierarchy,
	generateEnhancedTransposedVLMTable,
	type VLMViewMode
} from '@sden99/vlm-processing';

/**
 * Stratification condition extracted from WhereClauseDef
 */
export interface StratificationCondition {
	variable: string;
	value: string;
}

/**
 * Unique identifier for a parameter row
 */
export type VLMRowKey = string;

/**
 * Column header - represents a variable with VLM
 */
export interface VLMVariable {
	oid: string;
	name: string;
	dataType: string;
	label: string;
	valueListOID: string;
}

/**
 * Individual cell in the VLM table
 */
export interface VLMCell {
	itemRefOID: string;
	itemOID: string;
	whereClauseOID: string;
	methodOID?: string;
	codeListOID?: string;
	commentOID?: string;
	mandatory?: 'Yes' | 'No';
	variableName?: string;
	variants?: VLMCell[]; // Array of conditional variants if multiple ItemDefs exist
	conditions?: Record<string, { comparator: string; values: string[] }>; // Conditions for this variant
}

/**
 * Row in the VLM table
 */
export interface VLMRow {
	rowKey: VLMRowKey;
	paramcd: string;
	param: string; // Parameter description
	stratification: StratificationCondition[];
	cells: Map<string, VLMCell>;
}

/**
 * Complete VLM table data structure
 */
export interface VLMTableData {
	variables: VLMVariable[];
	rows: VLMRow[];
	parameterGroups: ParameterGroup[]; // NEW: Grouped by PARAMCD for parameter-centric UI
	datasetOID: string;
	datasetName: string;
	isAmbiguous?: boolean;
	ambiguityReason?: string;
	dominantVariable?: string;
	stratificationCoverage?: any;
	viewMode?: VLMViewMode;
	compactRowCount?: number;
	expandedRowCount?: number;
}

/**
 * Simple GlobalStateProvider implementation for vlm-processing
 */
class SimpleStateProvider {
	constructor(
		private datasets: any,
		private datasetId: string,
		private defineType: string
	) {}

	getSelectedDomain() {
		return this.defineType;
	}

	getSelectedDatasetId() {
		return this.datasetId;
	}

	getDefineXmlInfo() {
		const dataset =
			this.defineType === 'adam'
				? Object.values(this.datasets).find((ds: any) => ds.fileName?.endsWith('.xml') && ds.ADaM)
				: Object.values(this.datasets).find(
						(ds: any) => ds.fileName?.endsWith('.xml') && ds.SDTM
					);
		return (dataset as any)?.data || null;
	}

	getDatasets() {
		return this.datasets;
	}
}

/**
 * Transform ValueLevelMetadata into editable table structure
 *
 * Uses the proven generateEnhancedTransposedVLMTable algorithm
 * @param viewMode - 'compact' for PARAMCD-only rows (grouped), 'expanded' for full Cartesian expansion
 */
export function transformVLMForEditing(
	defineData: ParsedDefineXML,
	datasetOID: string,
	defineType?: 'adam' | 'sdtm',
	viewMode: VLMViewMode = 'compact'
): VLMTableData | null {
	const dataset = defineData.ItemGroups?.find((ig) => ig.OID === datasetOID);
	if (!dataset) {
		console.warn(`[vlmTableTransform] Dataset not found: ${datasetOID}`);
		return null;
	}

	const datasets = dataState.getDatasets();
	const targetDataset =
		defineType === 'adam'
			? Object.values(datasets).find((ds: any) => ds.fileName?.endsWith('.xml') && ds.ADaM === true)
			: Object.values(datasets).find(
					(ds: any) => ds.fileName?.endsWith('.xml') && ds.SDTM === true
				);

	if (!targetDataset?.enhancedDefineXML) {
		console.warn(`[vlmTableTransform] No enhanced Define-XML found for ${defineType}`);
		return null;
	}

	const itemGroup = targetDataset.enhancedDefineXML.enhancedItemGroups.get(datasetOID);
	const allVariables: ValueLevelMetadata[] = itemGroup?.valueLevelMetadata || [];

	// Filter to ONLY variables with actual VLM (have whereClause conditions)
	const vlmVariables = allVariables.filter(
		(v) => v.whereClause && v.whereClause.conditions?.length > 0
	);

	if (vlmVariables.length === 0) {
		console.warn(`[vlmTableTransform] No VLM variables found for dataset: ${datasetOID}`);
		return null;
	}

	// Use proven algorithms from vlm-processing
	const paramcdMapping = extractParamcdMapping(vlmVariables);
	const hierarchy = detectVLMStratificationHierarchy(vlmVariables);

	// Create simple state provider for vlm-processing
	const stateProvider = new SimpleStateProvider(datasets, datasetOID, defineType || 'adam');

	// Use the CORRECT algorithm from vlm-processing
	const vlmTableData = generateEnhancedTransposedVLMTable(
		vlmVariables,
		paramcdMapping,
		hierarchy,
		stateProvider,
		viewMode
	);

	// Convert from vlm-processing format to VLMTablePrototype format
	// vlm-processing: { columns: string[], rows: { rowKey, PARAMCD, [varName]: cellData } }
	// VLMTablePrototype: { variables: VLMVariable[], rows: { rowKey, paramcd, cells: Map } }

	// Build variables array - include ALL dataset variables, not just VLM ones
	// Get all ItemDefs for this dataset from the ItemGroup
	const allItemDefs = itemGroup?.itemRefs?.map((ref: any) => {
		const itemDef = (targetDataset.enhancedDefineXML as any)?.enhancedItemDefs?.get(ref.itemOID);
		return itemDef;
	}).filter(Boolean) || [];

	// Create variables array from all ItemDefs
	const allVariableNames = new Set([
		...vlmTableData.columns.filter((col) => col !== 'PARAMCD' && col !== 'PARAM'),
		...allItemDefs.map((item: any) => item.Name)
	]);

	const variables: VLMVariable[] = Array.from(allVariableNames)
		.filter((varName) => !vlmTableData.stratificationColumns.has(varName))
		.map((colName) => {
			// Find VLM variable first, then fall back to ItemDef
			const vlm = vlmVariables.find((v) => v.variable.name === colName);
			const itemDef = allItemDefs.find((item: any) => item.Name === colName);

			return {
				oid: vlm?.variable.oid || itemDef?.OID || `IT.${datasetOID}.${colName}`,
				name: colName,
				dataType: vlm?.variable.dataType || itemDef?.DataType || 'text',
				label: vlm?.variable.description || itemDef?.Description || colName,
				valueListOID: itemDef?.def_ValueListRef?.ValueListOID || ''
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

	// Convert rows
	const rows: VLMRow[] = vlmTableData.rows.map((vlmRow: any) => {
		const cells = new Map<string, VLMCell>();
		const stratification: StratificationCondition[] = [];

		// Extract stratification from row (only primitive values, not objects)
		Array.from(vlmTableData.stratificationColumns).forEach((stratVar) => {
			const value = vlmRow[stratVar];
			// Only include if it's a primitive value (string/number), not an object
			if (value && typeof value !== 'object') {
				stratification.push({
					variable: stratVar as string,
					value: String(value)
				});
			}
		});

		// Extract cells from row
		variables.forEach((variable) => {
			let cellData = vlmRow[variable.name];

			if (!cellData) return;

			// Handle array cells (multiple conditional ItemDefs for same variable)
			if (Array.isArray(cellData)) {
				// Multiple variants - create main cell with variants array
				const variants = cellData.map((variant: any) => ({
					itemRefOID: variable.oid,
					itemOID: variable.oid,
					whereClauseOID: variant.whereClauseOID || variant.whereClause?.oid || '',
					methodOID: variant.methodOID,
					codeListOID: variant.codeList?.oid,
					commentOID: variant.commentOID,
					mandatory: (variant.variable?.mandatory ? 'Yes' : 'No') as 'Yes' | 'No',
					variableName: variable.name,
					conditions: variant.conditions // Condition for this variant
				}));

				// Main cell uses first variant's data
				cells.set(variable.oid, {
					...variants[0],
					variants // Include all variants
				});
			} else {
				// Single variant
				cells.set(variable.oid, {
					itemRefOID: variable.oid,
					itemOID: variable.oid,
					whereClauseOID: cellData.whereClauseOID || cellData.whereClause?.oid || '',
					methodOID: cellData.methodOID,
					codeListOID: cellData.codeList?.oid,
					commentOID: cellData.commentOID,
					mandatory: (cellData.variable?.mandatory ? 'Yes' : 'No') as 'Yes' | 'No',
					variableName: variable.name,
					conditions: cellData.conditions
				});
			}
		});

		return {
			rowKey: vlmRow.rowKey,
			paramcd: vlmRow.PARAMCD,
			param: vlmRow.PARAM || vlmRow.PARAMCD, // Use PARAM or fall back to PARAMCD
			stratification,
			cells
		};
	});

	// Group rows by PARAMCD for Phase 1: Parameter-centric view
	const parameterGroups = groupRowsByParameter(rows);

	return {
		variables,
		rows,
		parameterGroups, // Grouped structure for parameter-centric UI
		datasetOID,
		datasetName: dataset.Name,
		isAmbiguous: vlmTableData.isAmbiguous,
		ambiguityReason: vlmTableData.ambiguityReason,
		dominantVariable: vlmTableData.dominantVariable,
		stratificationCoverage: vlmTableData.stratificationCoverage,
		viewMode,
		compactRowCount: vlmTableData.compactRowCount,
		expandedRowCount: vlmTableData.expandedRowCount
	};
}

/**
 * Parameter group structure for UI rendering
 */
export interface ParameterGroup {
	paramcd: string;
	param: string;
	baseRow: VLMRow; // The row with no or minimal stratification
	variantRows: VLMRow[]; // Additional stratified rows
	variantCount: number;
	totalRows: number;
	stratificationSummary: string; // e.g., "DTYPE, ANL04FL, AVISIT"
}

/**
 * Group rows by PARAMCD for parameter-centric UI
 */
export function groupRowsByParameter(rows: VLMRow[]): ParameterGroup[] {
	const groups = new Map<string, VLMRow[]>();

	// Group rows by PARAMCD
	rows.forEach((row) => {
		const paramcd = row.paramcd || 'UNKNOWN';
		if (!groups.has(paramcd)) {
			groups.set(paramcd, []);
		}
		groups.get(paramcd)!.push(row);
	});

	// Convert to ParameterGroup structure
	return Array.from(groups.entries()).map(([paramcd, paramRows]) => {
		// Sort by stratification complexity (fewer conditions first = base row)
		paramRows.sort((a, b) => a.stratification.length - b.stratification.length);

		const baseRow = paramRows[0]; // Row with fewest stratification conditions
		const variantRows = paramRows.slice(1); // Remaining rows are variants

		// Collect unique stratification variables across all rows
		const stratVars = new Set<string>();
		paramRows.forEach((row) => {
			row.stratification.forEach((s) => stratVars.add(s.variable));
		});

		return {
			paramcd,
			param: baseRow.param,
			baseRow,
			variantRows,
			variantCount: variantRows.length,
			totalRows: paramRows.length,
			stratificationSummary: Array.from(stratVars).join(', ')
		};
	});
}

/**
 * Format stratification for display
 */
export function formatStratification(stratification: StratificationCondition[]): string {
	if (stratification.length === 0) return '';
	return stratification.map((s) => `${s.variable}=${s.value}`).join(', ');
}

/**
 * Format row label for display with PARAMCD and PARAM
 */
export function formatRowLabel(row: VLMRow): { code: string; description: string; stratification: string } {
	const stratText = formatStratification(row.stratification);
	return {
		code: row.paramcd,
		description: row.param,
		stratification: stratText
	};
}
