/**
 * Type inference and distribution conversion logic for chart filters
 */

import type {
	ColumnMetadata,
	Distribution,
	DistributionOptions,
	CategoricalDistribution,
	CategoricalItem,
	CategoricalOptions,
	NumericalDistribution
} from './types';
import { DEFAULT_CATEGORICAL_OPTIONS, calculateCategoricalDistribution } from './categorical';
import { calculateNumericalDistribution } from './numerical';
import { calculateDateDistribution } from './date';

/**
 * Check if a value is strictly numeric (the entire value, not just a prefix)
 */
export function isStrictlyNumeric(value: unknown): boolean {
	if (typeof value === 'number') {
		return isFinite(value);
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed === '') return false;
		// Use Number() which requires the entire string to be numeric
		// Number("2 WEEKS") → NaN, Number("2") → 2
		const num = Number(trimmed);
		return !isNaN(num) && isFinite(num);
	}
	return false;
}

/**
 * Check if a value looks like a date (ISO format or common date patterns)
 */
export function isLikelyDate(value: unknown): boolean {
	if (value instanceof Date) {
		return !isNaN(value.getTime());
	}
	if (typeof value !== 'string') return false;

	const str = value.trim();

	// ISO date pattern: 2008-03-11 or 2008-03-11T00:00:00
	if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
		const date = new Date(str);
		return !isNaN(date.getTime());
	}

	// Common date patterns: MM/DD/YYYY, DD/MM/YYYY, etc.
	if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(str)) {
		const date = new Date(str);
		return !isNaN(date.getTime());
	}

	return false;
}

/**
 * Convert discrete numerical distribution to categorical
 * This provides better UX for low-cardinality integer data like treatment numbers
 */
export function convertDiscreteNumericalToCategorical(
	data: Record<string, unknown>[],
	columnId: string,
	numDist: NumericalDistribution,
	metadata: ColumnMetadata,
	options: CategoricalOptions = {}
): CategoricalDistribution {
	// Use same defaults as calculateCategoricalDistribution for consistency
	const opts = { ...DEFAULT_CATEGORICAL_OPTIONS, ...options };

	// Build items from the numerical bins
	const items: CategoricalItem[] = numDist.bins.map((bin) => ({
		value: String(bin.x0), // Use the discrete value as string
		decode: undefined,
		count: bin.count,
		percentage: bin.percentage
	}));

	// Sort by value (numeric order)
	items.sort((a, b) => Number(a.value) - Number(b.value));

	// Store all items
	const allItems = [...items];
	// Use same default as calculateCategoricalDistribution (5)
	const hasMore = items.length > (opts.maxItems || 5);
	const displayItems = hasMore ? items.slice(0, opts.maxItems) : items;

	return {
		type: 'categorical',
		columnId,
		items: displayItems,
		allItems,
		totalCount: numDist.stats.count + numDist.nullCount,
		nullCount: numDist.nullCount,
		hasMore
	};
}

/**
 * Infer column type from data and calculate distribution
 */
export function inferAndCalculateDistribution(
	data: Record<string, unknown>[],
	columnId: string,
	metadata: ColumnMetadata,
	options: DistributionOptions
): Distribution | null {
	if (data.length === 0) return null;

	// Sample first 100 non-null values
	const sampleSize = Math.min(100, data.length);
	let numericCount = 0;
	let dateCount = 0;
	let totalSampled = 0;

	for (let i = 0; i < sampleSize; i++) {
		const value = data[i][columnId];
		if (value === null || value === undefined || value === '') continue;

		totalSampled++;

		// Check if date first (dates can also pass numeric check as timestamps)
		if (isLikelyDate(value)) {
			dateCount++;
			continue;
		}

		// Check if strictly numeric (entire value must be a number)
		if (isStrictlyNumeric(value)) {
			numericCount++;
			continue;
		}
	}

	// Need at least 80% of sampled values to match a type
	const threshold = totalSampled * 0.8;

	// Prefer date detection over numeric (timestamps are numeric but should be dates)
	if (dateCount > threshold) {
		return calculateDateDistribution(data, columnId, options.date);
	}

	if (numericCount > threshold) {
		// Calculate numerical distribution, but check if it's discrete
		const numDist = calculateNumericalDistribution(data, columnId, options.numerical);

		// If using fixedBinEdges (cross-filtering), preserve the numerical type
		if (options.numerical?.fixedBinEdges) {
			return numDist;
		}

		// If discrete, convert to categorical for better UX
		if (numDist.isDiscrete) {
			return convertDiscreteNumericalToCategorical(
				data,
				columnId,
				numDist,
				metadata,
				options.categorical
			);
		}

		return numDist;
	}

	// Default to categorical
	return calculateCategoricalDistribution(data, columnId, metadata, options.categorical);
}
