/**
 * Numerical distribution calculation for chart filters
 */

import type { NumericalDistribution, NumericalBin, NumericalStats, NumericalOptions } from './types';

export const DEFAULT_NUMERICAL_OPTIONS: NumericalOptions = {
	minBins: 5,
	maxBins: 20
};

/**
 * Calculate optimal bin count using Sturges' formula
 */
export function calculateOptimalBinCount(n: number, options: NumericalOptions): number {
	if (options.binCount) {
		return options.binCount;
	}

	// Sturges' formula: k = 1 + log2(n)
	const sturges = Math.ceil(1 + Math.log2(n));

	const minBins = options.minBins || 5;
	const maxBins = options.maxBins || 20;

	return Math.max(minBins, Math.min(maxBins, sturges));
}

/**
 * Check if numerical data is discrete (low cardinality with integer-like values)
 */
export function isDiscreteNumerical(values: number[], uniqueValues: Set<number>): boolean {
	// If unique values <= 15 and all values are integers (or close to integers)
	if (uniqueValues.size > 15) return false;

	// Check if all values are effectively integers
	for (const v of uniqueValues) {
		if (Math.abs(v - Math.round(v)) > 0.001) {
			return false;
		}
	}

	return true;
}

/**
 * Calculate numerical distribution (histogram) for a column
 */
export function calculateNumericalDistribution(
	data: Record<string, unknown>[],
	columnId: string,
	options: NumericalOptions = {}
): NumericalDistribution {
	const opts = { ...DEFAULT_NUMERICAL_OPTIONS, ...options };

	// Extract numeric values
	const values: number[] = [];
	const uniqueValues = new Set<number>();
	let nullCount = 0;

	for (const row of data) {
		const value = row[columnId];

		if (value === null || value === undefined || value === '') {
			nullCount++;
		} else {
			const num = typeof value === 'number' ? value : parseFloat(String(value));
			if (!isNaN(num) && isFinite(num)) {
				values.push(num);
				uniqueValues.add(num);
			} else {
				nullCount++;
			}
		}
	}

	// Handle empty data
	if (values.length === 0) {
		return {
			type: 'numerical',
			columnId,
			bins: [],
			stats: { min: 0, max: 0, mean: 0, median: 0, count: 0 },
			nullCount,
			isDiscrete: false
		};
	}

	// Calculate stats
	values.sort((a, b) => a - b);
	const min = values[0];
	const max = values[values.length - 1];
	const sum = values.reduce((a, b) => a + b, 0);
	const mean = sum / values.length;
	const median =
		values.length % 2 === 0
			? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
			: values[Math.floor(values.length / 2)];

	const stats: NumericalStats = {
		min,
		max,
		mean,
		median,
		count: values.length
	};

	// Check if data is discrete (low cardinality integers)
	const isDiscrete = isDiscreteNumerical(values, uniqueValues);

	let bins: NumericalBin[] = [];

	if (opts.fixedBinEdges && opts.fixedBinEdges.length >= 2) {
		// Use fixed bin edges (for ghost overlay alignment)
		const edges = opts.fixedBinEdges;
		for (let i = 0; i < edges.length - 1; i++) {
			bins.push({
				x0: edges[i],
				x1: edges[i + 1],
				count: 0,
				percentage: 0
			});
		}

		// Count values in each bin
		for (const value of values) {
			for (let i = 0; i < bins.length; i++) {
				const bin = bins[i];
				// Value falls in this bin if: x0 <= value < x1 (or value <= x1 for last bin)
				const inBin =
					i === bins.length - 1
						? value >= bin.x0 && value <= bin.x1
						: value >= bin.x0 && value < bin.x1;
				if (inBin) {
					bin.count++;
					break;
				}
			}
		}

		// Calculate percentages
		for (const bin of bins) {
			bin.percentage = values.length > 0 ? (bin.count / values.length) * 100 : 0;
		}
	} else if (isDiscrete) {
		// Create one bin per unique value for discrete data
		const sortedUnique = Array.from(uniqueValues).sort((a, b) => a - b);
		const valueCounts = new Map<number, number>();

		for (const v of values) {
			valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
		}

		for (const v of sortedUnique) {
			const count = valueCounts.get(v) || 0;
			bins.push({
				x0: v,
				x1: v + 1, // For discrete, x0 is the actual value, x1 is just for display width
				count,
				percentage: values.length > 0 ? (count / values.length) * 100 : 0
			});
		}
	} else {
		// Standard histogram binning for continuous data
		const binCount = calculateOptimalBinCount(values.length, opts);
		const binWidth = (max - min) / binCount || 1; // Avoid division by zero

		for (let i = 0; i < binCount; i++) {
			bins.push({
				x0: min + i * binWidth,
				x1: min + (i + 1) * binWidth,
				count: 0,
				percentage: 0
			});
		}

		// Count values in each bin
		for (const value of values) {
			let binIndex = Math.floor((value - min) / binWidth);
			// Handle edge case where value === max
			if (binIndex >= binCount) binIndex = binCount - 1;
			bins[binIndex].count++;
		}

		// Calculate percentages
		for (const bin of bins) {
			bin.percentage = values.length > 0 ? (bin.count / values.length) * 100 : 0;
		}
	}

	return {
		type: 'numerical',
		columnId,
		bins,
		stats,
		nullCount,
		isDiscrete
	};
}
