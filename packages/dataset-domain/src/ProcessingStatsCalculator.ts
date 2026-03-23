import type { ProcessingResult } from '@sden99/data-processing/types';
import type { ProcessingStats } from './types';

/**
 * Pure function to calculate processing statistics from file and result
 * Includes null safety for all properties
 */
export const calculateProcessingStats = (
	file: File,
	result: ProcessingResult
): ProcessingStats => ({
	uploadTime: result.processingTime ? Number(result.processingTime.toFixed(2)) : 0,
	numColumns: result.details?.num_columns ?? null,
	numRows: result.details?.num_rows ?? null,
	datasetSize: file?.size ?? null
});