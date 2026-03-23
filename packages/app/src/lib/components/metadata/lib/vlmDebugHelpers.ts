/**
 * VLM Debug Helpers
 *
 * Utilities for investigating VLM variant structures
 */

import type { VLMCell, VLMRow, VLMTableData } from '../../../utils/metadata/vlmTableTransform';

/**
 * Analyze variant patterns across a parameter group
 */
export function analyzeParameterVariants(
	paramcd: string,
	rows: VLMRow[],
	variables: { oid: string; name: string }[]
) {
	const paramRows = rows.filter(r => r.paramcd === paramcd);
	if (paramRows.length === 0) return null;

	console.group(`🔍 Parameter: ${paramcd} (${paramRows.length} rows)`);

	// Collect all variants across all variables
	const variantData: Record<string, {
		variantCount: number;
		conditions: any[];
		sampleCell: VLMCell | null;
	}> = {};

	variables.forEach(variable => {
		const cells = paramRows.map(row => row.cells.get(variable.oid)).filter(Boolean);
		const cellsWithVariants = cells.filter(cell => cell?.variants && cell.variants.length > 0);

		if (cellsWithVariants.length > 0) {
			const firstCell = cellsWithVariants[0]!;
			variantData[variable.name] = {
				variantCount: firstCell.variants?.length || 0,
				conditions: firstCell.variants?.map(v => v.conditions) || [],
				sampleCell: firstCell
			};
		}
	});

	// Display findings
	console.log('Variables with variants:');
	Object.entries(variantData).forEach(([varName, data]) => {
		console.log(`  ${varName}: ${data.variantCount} variants`);
		data.conditions.forEach((cond, i) => {
			console.log(`    Variant ${i + 1}:`, cond);
		});
	});

	// Check for condition alignment
	const allConditions = Object.values(variantData).flatMap(d => d.conditions);
	if (allConditions.length > 0) {
		console.log('\n📊 Condition Signature Analysis:');
		const signatures = new Map<string, string[]>();

		Object.entries(variantData).forEach(([varName, data]) => {
			data.conditions.forEach((cond, i) => {
				const sig = JSON.stringify(cond);
				if (!signatures.has(sig)) {
					signatures.set(sig, []);
				}
				signatures.get(sig)!.push(`${varName}[${i}]`);
			});
		});

		signatures.forEach((vars, sig) => {
			console.log(`\n  Condition: ${sig}`);
			console.log(`  Shared by: ${vars.join(', ')}`);
		});
	}

	console.groupEnd();

	return variantData;
}

/**
 * Analyze all parameters in a VLM table
 */
export function analyzeVLMTable(vlmData: VLMTableData) {
	console.group('🔬 VLM Table Analysis');
	console.log(`Dataset: ${vlmData.datasetName} (${vlmData.datasetOID})`);
	console.log(`Parameters: ${vlmData.parameterGroups.length}`);
	console.log(`Rows: ${vlmData.rows.length}`);
	console.log(`Variables: ${vlmData.variables.length}`);

	// Analyze each parameter
	vlmData.parameterGroups.forEach(group => {
		analyzeParameterVariants(group.paramcd, vlmData.rows, vlmData.variables);
	});

	console.groupEnd();
}

/**
 * Create a comparable condition signature
 */
export function getConditionSignature(conditions: Record<string, any> | undefined): string {
	if (!conditions) return 'NO_CONDITIONS';

	// Sort keys for consistent comparison
	const sorted = Object.keys(conditions).sort().map(key => {
		const cond = conditions[key];
		return `${key}${cond.comparator}${JSON.stringify(cond.values)}`;
	}).join('|');

	return sorted;
}

/**
 * Group variants by condition signature across variables
 */
export function groupVariantsByCondition(
	paramRows: VLMRow[],
	variables: { oid: string; name: string }[]
): Map<string, { condition: any; variables: Map<string, VLMCell> }> {
	const conditionGroups = new Map<string, { condition: any; variables: Map<string, VLMCell> }>();

	variables.forEach(variable => {
		paramRows.forEach(row => {
			const cell = row.cells.get(variable.oid);
			if (!cell?.variants) return;

			cell.variants.forEach(variant => {
				const sig = getConditionSignature(variant.conditions);

				if (!conditionGroups.has(sig)) {
					conditionGroups.set(sig, {
						condition: variant.conditions,
						variables: new Map()
					});
				}

				conditionGroups.get(sig)!.variables.set(variable.name, variant as any);
			});
		});
	});

	return conditionGroups;
}
