// packages/app/src/lib/core/processors/datasetjson/DatasetJsonProcessor.ts
import type { ProcessingResult } from '@sden99/data-processing/types';
import { DatasetJsonProcessor as DatasetJsonDataProcessor } from '@sden99/data-processing';
import { FileType, type FileProcessor, type FileValidationResult } from '$lib/core/types/fileTypes';
import type { DatasetLoadingState } from '$lib/core/types/types';

const FILE_CONSTRAINTS = {
	MAX_SIZE: 500 * 1024 * 1024, // 500MB
	EXTENSION: '.json'
} as const;

export class DatasetJsonProcessor implements FileProcessor {
	validateFile(file: File): FileValidationResult {
		if (file.size > FILE_CONSTRAINTS.MAX_SIZE) {
			return {
				valid: false,
				error: `File ${file.name} exceeds maximum size limit of 500MB`,
				fileType: FileType.DATASET_JSON
			};
		}

		const fileName = file.name.toLowerCase();
		if (!fileName.endsWith(FILE_CONSTRAINTS.EXTENSION)) {
			return {
				valid: false,
				error: `File ${file.name} is not a valid JSON file`,
				fileType: FileType.DATASET_JSON
			};
		}

		return { valid: true, fileType: FileType.DATASET_JSON };
	}

	async processFile(
		file: File,
		onProgress?: (state: DatasetLoadingState) => void
	): Promise<ProcessingResult> {
		const startTime = performance.now();

		if (onProgress) {
			onProgress({
				status: 'processing',
				fileName: file.name,
				progress: 0,
				totalSize: file.size,
				loadedSize: 0
			});
		}

		try {
			// Read file as text
			const text = await file.text();

			if (onProgress) {
				onProgress({
					status: 'processing',
					fileName: file.name,
					progress: 50,
					totalSize: file.size,
					loadedSize: file.size
				});
			}

			// Process with data-processing package
			const processor = new DatasetJsonDataProcessor();
			const result = await processor.process(text);

			const processingTime = (performance.now() - startTime) / 1000;

			if (onProgress) {
				onProgress({
					status: 'complete',
					fileName: file.name,
					progress: 100,
					totalSize: file.size,
					loadedSize: file.size,
					processingTime
				});
			}

			// Add app-layer metadata
			return {
				...result,
				metrics: {
					...result.metrics,
					uploadTime: processingTime
				}
			} as ProcessingResult;
		} catch (error) {
			if (onProgress) {
				onProgress({
					status: 'error',
					fileName: file.name,
					error: error instanceof Error ? error.message : String(error),
					progress: 0,
					totalSize: file.size,
					loadedSize: 0
				});
			}
			throw error;
		}
	}
}
