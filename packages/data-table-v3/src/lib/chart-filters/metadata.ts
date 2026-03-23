/**
 * Type resolution and metadata handling for chart filters
 */

import type { ColumnType, ColumnMetadata, DefineVariable, DatasetDetails } from './types';

/**
 * Map Define-XML dataType to our ColumnType
 */
export function mapDefineType(dataType: string): ColumnType {
	const lower = dataType.toLowerCase();

	if (lower === 'text' || lower === 'string' || lower === 'char') {
		return 'categorical';
	}
	if (
		lower === 'integer' ||
		lower === 'float' ||
		lower === 'double' ||
		lower === 'decimal' ||
		lower === 'number'
	) {
		return 'numerical';
	}
	if (lower === 'date' || lower === 'datetime' || lower === 'time') {
		return 'date';
	}

	return 'unknown';
}

/**
 * Map pandas dtype to our ColumnType
 */
export function mapPandasType(dtype: string): ColumnType {
	const lower = dtype.toLowerCase();

	if (lower === 'object' || lower === 'string' || lower === 'category') {
		return 'categorical';
	}
	if (lower.includes('int') || lower.includes('float') || lower.includes('double')) {
		return 'numerical';
	}
	if (lower.includes('datetime') || lower.includes('date') || lower.includes('time')) {
		return 'date';
	}

	return 'unknown';
}

/**
 * Resolve column metadata from Define-XML (primary) or pandas dtype (fallback)
 */
export function resolveColumnMetadata(
	columnId: string,
	defineVariables?: DefineVariable[],
	datasetDetails?: DatasetDetails
): ColumnMetadata {
	// 1. Try Define-XML first (most authoritative)
	const defineVar = defineVariables?.find((v) => v.variable.name === columnId);

	if (defineVar) {
		return {
			columnId,
			type: mapDefineType(defineVar.variable.dataType),
			codelist: defineVar.codeList?.items,
			source: 'define-xml'
		};
	}

	// 2. Fall back to pandas dtype
	const dtype = datasetDetails?.dtypes?.[columnId];

	if (dtype) {
		return {
			columnId,
			type: mapPandasType(dtype),
			codelist: undefined,
			source: 'pandas'
		};
	}

	// 3. Unknown
	return {
		columnId,
		type: 'unknown',
		codelist: undefined,
		source: 'inferred'
	};
}

/**
 * Resolve metadata for all columns
 */
export function resolveAllColumnMetadata(
	columnIds: string[],
	defineVariables?: DefineVariable[],
	datasetDetails?: DatasetDetails
): Map<string, ColumnMetadata> {
	const result = new Map<string, ColumnMetadata>();

	for (const columnId of columnIds) {
		result.set(columnId, resolveColumnMetadata(columnId, defineVariables, datasetDetails));
	}

	return result;
}
