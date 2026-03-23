import type { ProcessingResult } from '@sden99/data-processing/types';
import type { Dataset } from './types';
import { calculateProcessingStats } from './ProcessingStatsCalculator';

/**
 * Pure function to create a Dataset from file and processing result
 * No side effects - just transforms input data to output format
 * Handles both SAS7BDAT and DefineXML processing results
 */
export const createDatasetFromProcessingResult = (
	file: File,
	result: ProcessingResult
): Dataset => ({
	fileName: file.name,
	data: result.data,
	details: result.details ? {
		...result.details,
		summary: result.details.summary || {}
	} : undefined,
	graphData: 'graphData' in result ? result.graphData : undefined,
	processingStats: calculateProcessingStats(file, result),
	ADaM: 'ADaM' in result ? result.ADaM : undefined,
	SDTM: 'SDTM' in result ? result.SDTM : undefined
});