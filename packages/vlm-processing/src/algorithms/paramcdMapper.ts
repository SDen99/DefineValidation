/**
 * PARAMCD Mapping Extraction Algorithm
 * Extracted from vlmProcessingState.svelte.ts for reusability
 */

import type { ValueLevelMetadata } from '@sden99/data-processing';

/**
 * Extracts PARAMCD to description mapping from VLM variables
 * First tries to get from codelist, falls back to condition analysis
 */
export function extractParamcdMapping(vlmScopedVariables: ValueLevelMetadata[]): Record<string, string> {
	const paramcdMapping: Record<string, string> = {};
	const paramcdVlm = vlmScopedVariables.find((vlm) => vlm.variable.name === 'PARAMCD');

	// First, try to get from codelist
	if (paramcdVlm?.codeList?.items) {
		paramcdVlm.codeList.items.forEach((item) => {
			paramcdMapping[item.codedValue] = item.decode;
		});
		return paramcdMapping;
	}

	// Fall back to extracting from conditions
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