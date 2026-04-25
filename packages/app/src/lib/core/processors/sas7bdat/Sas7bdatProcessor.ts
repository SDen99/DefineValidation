// packages/app/src/lib/core/processors/sas7bdat/Sas7bdatProcessor.ts
import type { ProcessingResult } from '@sden99/data-processing/types';
import { FileType, type FileProcessor, type FileValidationResult } from '$lib/core/types/fileTypes';
import type { DatasetLoadingState } from '$lib/core/types/types';
import type { WorkerPool } from '$lib/core/services/workerPool';

const FILE_CONSTRAINTS = {
	MAX_SIZE: 500 * 1024 * 1024, // 500MB
	EXTENSIONS: ['.sas7bdat', '.xpt']
} as const;

export class Sas7bdatProcessor implements FileProcessor {
	private workerPool: WorkerPool;

	constructor(workerPool: WorkerPool) {
		if (!workerPool) {
			throw new Error('WorkerPool is required for Sas7bdatProcessor');
		}
		this.workerPool = workerPool;
	}

	validateFile(file: File): FileValidationResult {
		if (file.size > FILE_CONSTRAINTS.MAX_SIZE) {
			return {
				valid: false,
				error: `File ${file.name} exceeds maximum size limit of 500MB`,
				fileType: FileType.SAS7BDAT
			};
		}

		const fileName = file.name.toLowerCase();
		const isValidExtension = FILE_CONSTRAINTS.EXTENSIONS.some(ext => fileName.endsWith(ext));

		if (!isValidExtension) {
			return {
				valid: false,
				error: `File ${file.name} is not a valid SAS dataset (must be .sas7bdat or .xpt)`,
				fileType: FileType.SAS7BDAT
			};
		}

		return { valid: true, fileType: FileType.SAS7BDAT };
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
			// Use the worker pool (it handles the file conversion internally)
			const result = await this.workerPool.processFile(file, file.name, onProgress || (() => {}));

			const processingTime = (performance.now() - startTime) / 1000;

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
