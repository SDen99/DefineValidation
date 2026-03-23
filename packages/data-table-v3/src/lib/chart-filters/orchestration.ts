/**
 * Main distribution calculation API for chart filters
 */

import type { ColumnMetadata, Distribution, DistributionOptions } from './types';
import { calculateCategoricalDistribution } from './categorical';
import { calculateNumericalDistribution } from './numerical';
import { calculateDateDistribution } from './date';
import { inferAndCalculateDistribution, convertDiscreteNumericalToCategorical } from './inference';

/**
 * Calculate distribution for a single column based on its type
 */
export function calculateDistribution(
	data: Record<string, unknown>[],
	columnId: string,
	metadata: ColumnMetadata,
	options: DistributionOptions = {}
): Distribution | null {
	switch (metadata.type) {
		case 'categorical':
			return calculateCategoricalDistribution(data, columnId, metadata, options.categorical);

		case 'numerical': {
			// First calculate numerical distribution to check if it's discrete
			const numDist = calculateNumericalDistribution(data, columnId, options.numerical);

			// If using fixedBinEdges (cross-filtering), preserve the numerical type
			// Don't convert to categorical even if data is sparse
			if (options.numerical?.fixedBinEdges) {
				return numDist;
			}

			// If discrete (low cardinality integers like 1, 2, 3), treat as categorical
			// This gives better UX with horizontal bars and Set filters
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

		case 'date':
			return calculateDateDistribution(data, columnId, options.date);

		default:
			// Try to infer from data
			return inferAndCalculateDistribution(data, columnId, metadata, options);
	}
}

/**
 * Calculate distributions for all columns
 */
export function calculateAllDistributions(
	data: Record<string, unknown>[],
	metadataMap: Map<string, ColumnMetadata>,
	options: DistributionOptions = {}
): Map<string, Distribution> {
	const result = new Map<string, Distribution>();

	for (const [columnId, metadata] of metadataMap) {
		const distribution = calculateDistribution(data, columnId, metadata, options);
		if (distribution) {
			result.set(columnId, distribution);
		}
	}

	return result;
}

/**
 * Recalculate distributions for cross-filtering
 * Excludes the column that triggered the filter change
 */
export function recalculateDistributionsForCrossFilter(
	filteredData: Record<string, unknown>[],
	metadataMap: Map<string, ColumnMetadata>,
	excludeColumnId: string,
	options: DistributionOptions = {}
): Map<string, Distribution> {
	const result = new Map<string, Distribution>();

	for (const [columnId, metadata] of metadataMap) {
		if (columnId === excludeColumnId) continue;

		const distribution = calculateDistribution(filteredData, columnId, metadata, options);
		if (distribution) {
			result.set(columnId, distribution);
		}
	}

	return result;
}
