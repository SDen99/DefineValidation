/**
 * VLM Stratification Hierarchy Detection Algorithm
 * Migrated from vlmProcessingState.svelte.ts
 */

import type { ValueLevelMetadata } from '@sden99/data-processing';
import type { EnhancedStratificationHierarchy } from '../types';

/**
 * Detects VLM stratification hierarchy based on variable impact analysis
 */
export function detectVLMStratificationHierarchy(
	vlmScopedVariables: ValueLevelMetadata[]
): EnhancedStratificationHierarchy {
	const variableImpact: Record<
		string,
		{
			affectedVariables: Set<string>;
			totalDefinitions: number;
		}
	> = {};

	const variableNames = new Set<string>();
	vlmScopedVariables.forEach((vlm) => {
		variableNames.add(vlm.variable.name);

		if (vlm.whereClause) {
			vlm.whereClause.conditions.forEach((condition) => {
				const variableName = condition.variable;

				// Process ALL variables found in WhereClause conditions
				// (except self-references to avoid circular definitions)
				// Per CDISC Define-XML 2.1: RangeCheck can reference ANY ItemDef
				if (variableName && variableName !== vlm.variable.name) {
					if (!variableImpact[variableName]) {
						variableImpact[variableName] = {
							affectedVariables: new Set(),
							totalDefinitions: 0
						};
					}

					const impact = variableImpact[variableName];
					impact.affectedVariables.add(vlm.variable.name);
					impact.totalDefinitions++;
				}
			});
		}
	});

	const analysis: Record<
		string,
		{
			affectedVariables: number;
			totalDefinitions: number;
			impactScore: number;
		}
	> = {};

	const SEMANTIC_PRIORITY: Record<string, number> = {
		DTYPE: 1.0,
		PARCAT1: 0.8,
		PARCAT2: 0.7,
		PARCAT: 0.6,
		QNAM: 0.5,
		AVISIT: 0.3,
		APHASE: 0.2,
		QVAL: 0.1
	};

	const totalVariables = variableNames.size;

	Object.entries(variableImpact).forEach(([stratVar, impact]) => {
		const affectedVariables = impact.affectedVariables.size;
		const variableBreadth = affectedVariables / totalVariables;
		const definitionFrequency = Math.min(impact.totalDefinitions / 5, 1);
		const semanticWeight = SEMANTIC_PRIORITY[stratVar] || 0.1;
		const impactScore = semanticWeight * 0.5 + variableBreadth * 0.3 + definitionFrequency * 0.2;

		analysis[stratVar] = {
			affectedVariables,
			totalDefinitions: impact.totalDefinitions,
			impactScore
		};
	});

	// Sort variables by impact score for display ordering
	const sortedVariables = Object.entries(analysis).sort(
		([, a], [, b]) => b.impactScore - a.impactScore
	);

	// For editable Define-XML: ALL detected variables should be visible
	// Make everything "primary" - no arbitrary filtering via impact scores
	const primary: string[] = sortedVariables.map(([stratVar]) => stratVar);
	const secondary: string[] = [];

	// Note: Impact scores are still calculated for ordering purposes,
	// but they no longer determine visibility (primary vs secondary)
	// This ensures complete transparency for Define-XML editing

	// AMBIGUITY DETECTION
	// Unambiguous: One variable appears in >90% of ValueListDefs (e.g., PARAMCD in ADQSADAS)
	// Ambiguous: Different ValueListDefs use disjoint stratification variables (e.g., ADAG)
	const totalValueListDefs = vlmScopedVariables.length;
	let isAmbiguous = true;
	let ambiguityReason: string | undefined;
	let dominantVariable: string | undefined;
	let stratificationCoverage: number | undefined;

	if (totalValueListDefs > 0 && sortedVariables.length > 0) {
		// Find the most frequently used stratification variable
		const [mostFrequentVar, mostFrequentAnalysis] = sortedVariables[0];
		const coverage = mostFrequentAnalysis.affectedVariables / totalVariables;
		stratificationCoverage = Math.round(coverage * 100);

		// Unambiguous if one variable appears in ≥90% of ValueListDefs
		if (coverage >= 0.9) {
			isAmbiguous = false;
			dominantVariable = mostFrequentVar;
			ambiguityReason = undefined;
		} else {
			// Ambiguous - multiple disjoint stratification dimensions
			isAmbiguous = true;
			dominantVariable = mostFrequentVar; // Still track the most common one

			const stratVarsSummary = sortedVariables
				.slice(0, 3)
				.map(([v, a]) => `${v} (${Math.round((a.affectedVariables / totalVariables) * 100)}%)`)
				.join(', ');

			ambiguityReason = `Multiple stratification dimensions with no dominant variable. Most common: ${stratVarsSummary}. Row structure represents full cartesian product of conditions.`;
		}
	}

	return {
		primary,
		secondary,
		analysis,
		isAmbiguous,
		ambiguityReason,
		dominantVariable,
		stratificationCoverage
	};
}

/**
 * Extracts PARAMCD mapping from VLM variables
 */
export function extractParamcdMapping(vlmScopedVariables: ValueLevelMetadata[]): Record<string, string> {
	const paramcdMapping: Record<string, string> = {};
	const paramcdVlm = vlmScopedVariables.find((vlm) => vlm.variable.name === 'PARAMCD');

	if (paramcdVlm?.codeList?.items) {
		paramcdVlm.codeList.items.forEach((item) => {
			paramcdMapping[item.codedValue] = item.decode;
		});
		return paramcdMapping;
	}

	const paramcdValues = new Set<string>();
	vlmScopedVariables.forEach((vlm) => {
		if (vlm.whereClause) {
			vlm.whereClause.conditions.forEach((condition) => {
				if (condition.variable === 'PARAMCD') {
					condition.checkValues.forEach((value) => paramcdValues.add(value));
				}
			});
		}
	});

	paramcdValues.forEach((value) => {
		paramcdMapping[value] = value;
	});

	if (Object.keys(paramcdMapping).length === 0) {
		console.error('[CRITICAL] No PARAMCD mapping found!');
	}

	return paramcdMapping;
}