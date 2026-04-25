/**
 * Validation Export
 *
 * Exports validation results to CSV for regulatory submission reports.
 */

import type { ValidationResult } from '@sden99/validation-engine';
import type { ValidationCacheEntry } from './validationService.svelte';

function escapeCSV(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

const CSV_HEADER = 'Rule ID,Severity,Variable,Issue Count,Affected Rows,Message';

function resultToCSVRow(result: ValidationResult): string {
	const affectedRows = result.affectedRows.length > 0
		? result.affectedRows.join(';')
		: '';
	return [
		escapeCSV(result.ruleId),
		result.severity,
		escapeCSV(result.columnId),
		String(result.issueCount),
		escapeCSV(affectedRows),
		escapeCSV(result.message)
	].join(',');
}

/**
 * Export validation results for a single dataset as CSV.
 */
export function exportResultsAsCSV(
	results: ValidationResult[],
	datasetName: string
): string {
	if (results.length === 0) return CSV_HEADER;
	const rows = results.map(resultToCSVRow);
	return `${CSV_HEADER}\n${rows.join('\n')}`;
}

/**
 * Export all validation results across all datasets as CSV.
 * Prepends a Dataset column.
 */
export function exportAllResultsAsCSV(
	resultsByDataset: Map<string, ValidationCacheEntry>
): string {
	const header = `Dataset,${CSV_HEADER}`;
	const rows: string[] = [];

	for (const [datasetId, entry] of resultsByDataset) {
		for (const result of entry.results) {
			rows.push(`${escapeCSV(datasetId)},${resultToCSVRow(result)}`);
		}
	}

	if (rows.length === 0) return header;
	return `${header}\n${rows.join('\n')}`;
}

/**
 * Trigger a browser download of the given CSV content.
 */
export function downloadCSV(csv: string, filename: string): void {
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
