/**
 * Structural Checks
 *
 * Checks for structural mismatches between Define-XML variables
 * and actual data columns (missing vars, undocumented vars).
 * Runs on the main thread — no row iteration needed.
 */

import type { ValidationResult, DefineVariableForValidation } from '@sden99/validation-engine';

/**
 * Check for structural mismatches between Define-XML variables and actual data columns.
 */
export function checkStructuralMismatches(
	datasetData: Record<string, unknown>[],
	defineVars: DefineVariableForValidation[],
	domain: string
): ValidationResult[] {
	if (datasetData.length === 0) return [];

	const results: ValidationResult[] = [];
	const dataColumns = new Set(Object.keys(datasetData[0]));
	const defineNames = new Set(defineVars.map((v) => v.name));

	for (const name of defineNames) {
		if (!dataColumns.has(name)) {
			results.push({
				ruleId: `AUTO.MISSING_VAR.${domain}.${name}`,
				columnId: name,
				severity: 'warning',
				issueCount: 1,
				affectedRows: [],
				message: `Variable ${name} is defined in the Define-XML but missing from the dataset`,
				details: {
					invalidValues: new Map(),
					rule: {
						Core: { Id: `AUTO.MISSING_VAR.${domain}.${name}`, Version: '1', Status: 'Draft' },
						Authorities: [{
							Organization: 'Auto-Generated',
							Standards: [{
								Name: domain,
								Version: '1.0',
								References: [{
									Rule_Identifier: { Id: `AUTO.MISSING_VAR.${domain}.${name}`, Version: '1' },
									Origin: 'Define-XML Auto-Generation',
									Version: '1.0'
								}]
							}]
						}],
						Description: `${name} is defined in metadata but not present in data`,
						Sensitivity: 'Dataset',
						Executability: 'Fully Executable',
						Rule_Type: 'Missing Variable',
						Target_Variable: name,
						Scope: { Domains: { Include: [domain] } },
						Check: { name, operator: 'empty' },
						Outcome: { Message: `Variable ${name} missing from dataset`, Output_Variables: [name] }
					}
				}
			});
		}
	}

	for (const col of dataColumns) {
		if (!defineNames.has(col)) {
			results.push({
				ruleId: `AUTO.UNDOCUMENTED_VAR.${domain}.${col}`,
				columnId: col,
				severity: 'info',
				issueCount: 1,
				affectedRows: [],
				message: `Variable ${col} exists in the dataset but is not documented in the Define-XML`,
				details: {
					invalidValues: new Map(),
					rule: {
						Core: { Id: `AUTO.UNDOCUMENTED_VAR.${domain}.${col}`, Version: '1', Status: 'Draft' },
						Authorities: [{
							Organization: 'Auto-Generated',
							Standards: [{
								Name: domain,
								Version: '1.0',
								References: [{
									Rule_Identifier: { Id: `AUTO.UNDOCUMENTED_VAR.${domain}.${col}`, Version: '1' },
									Origin: 'Define-XML Auto-Generation',
									Version: '1.0'
								}]
							}]
						}],
						Description: `${col} is present in data but not defined in metadata`,
						Sensitivity: 'Dataset',
						Executability: 'Fully Executable',
						Rule_Type: 'Undocumented Variable',
						Target_Variable: col,
						Scope: { Domains: { Include: [domain] } },
						Check: { name: col, operator: 'non_empty' },
						Outcome: { Message: `Variable ${col} not in Define-XML`, Output_Variables: [col] }
					}
				}
			});
		}
	}

	return results;
}
