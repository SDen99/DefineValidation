/**
 * Rule Exporter
 *
 * Export validation rules to CDISC-compatible YAML or JSON format.
 */

import { dump as yamlDump } from 'js-yaml';
import { internalToCdisc, type Rule } from '@sden99/validation-engine';

/**
 * Export rules to CDISC-compatible YAML format.
 * Converts internal field names (underscores) back to CDISC names (spaces).
 */
export function exportRulesToYaml(rules: Rule[]): string {
	const cdiscRules = rules.map((r) => internalToCdisc(r));
	return yamlDump(cdiscRules.length === 1 ? cdiscRules[0] : cdiscRules, {
		noRefs: true,
		lineWidth: 120,
		quotingType: '"'
	});
}

/**
 * Export rules to CDISC-compatible JSON format.
 * Converts internal field names (underscores) back to CDISC names (spaces).
 */
export function exportRulesToJson(rules: Rule[]): string {
	const cdiscRules = rules.map((r) => internalToCdisc(r));
	return JSON.stringify(cdiscRules.length === 1 ? cdiscRules[0] : cdiscRules, null, 2);
}

/**
 * Trigger a browser file download with the given content.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
