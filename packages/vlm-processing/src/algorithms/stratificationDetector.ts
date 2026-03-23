/**
 * VLM Stratification Detection Algorithm
 * Extracted from vlmProcessingState.svelte.ts for reusability
 */

import type { ValueLevelMetadata } from '@sden99/data-processing';
import type { EnhancedStratificationHierarchy } from '../types';

/**
 * Detects VLM stratification hierarchy from VLM variables
 * Analyzes conditions to determine primary and secondary stratification variables
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

				if (
					variableName &&
					['DTYPE', 'PARCAT', 'PARCAT1', 'PARCAT2', 'QNAM', 'QVAL', 'AVISIT', 'APHASE'].includes(
						variableName
					)
				) {
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

	const sortedVariables = Object.entries(analysis).sort(
		([, a], [, b]) => b.impactScore - a.impactScore
	);
	const primary: string[] = [];
	const secondary: string[] = [];

	sortedVariables.forEach(([stratVar, metrics]) => {
		const semanticWeight = SEMANTIC_PRIORITY[stratVar] || 0.1;
		const shouldBePrimary =
			stratVar === 'DTYPE' ||
			(semanticWeight >= 0.6 && metrics.totalDefinitions > 0) ||
			metrics.impactScore >= 0.4;

		if (shouldBePrimary) {
			primary.push(stratVar);
		} else {
			secondary.push(stratVar);
		}
	});

	if (primary.length === 0 && sortedVariables.length > 0) {
		const topVariable = sortedVariables[0];
		primary.push(topVariable[0]);
		const index = secondary.indexOf(topVariable[0]);
		if (index > -1) secondary.splice(index, 1);
	}

	return {
		primary,
		secondary,
		analysis,
		isAmbiguous: false, // Test helper - defaults to unambiguous
		dominantVariable: primary[0],
		stratificationCoverage: 100
	};
}