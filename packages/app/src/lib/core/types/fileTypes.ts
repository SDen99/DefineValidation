// packages/app/src/lib/core/types/fileTypes.ts
import type { ProcessingResult } from '@sden99/data-processing/types';
import type { DatasetLoadingState } from './types';

export enum FileType {
	SAS7BDAT = 'sas7bdat',
	DEFINEXML = 'definexml',
	DATASET_JSON = 'datasetjson',
	YAML_RULE = 'yaml_rule'
}

export interface FileValidationResult {
	valid: boolean;
	error?: string;
	fileType?: FileType;
}

export interface FileProcessor {
	validateFile(file: File): FileValidationResult;
	processFile(
		file: File,
		onProgress?: (state: DatasetLoadingState) => void
	): Promise<ProcessingResult>;
}
