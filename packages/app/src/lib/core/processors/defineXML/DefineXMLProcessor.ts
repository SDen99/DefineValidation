// packages/app/src/lib/core/processors/defineXML/DefineXMLProcessor.ts
import { DefineXMLDataProcessor } from '@sden99/data-processing/definexml';
import { FileType, type FileProcessor, type ValidationResult } from '$lib/core/types/fileTypes';
import { graphXML } from '@sden99/data-processing';
import type { DatasetLoadingState } from '$lib/core/types/types';
import type { ProcessingResult } from '@sden99/data-processing/types';

export class DefineXMLProcessor implements FileProcessor {
	private dataProcessor = new DefineXMLDataProcessor();

	validateFile(file: File): ValidationResult {
		if (!file.name.toLowerCase().endsWith('.xml')) {
			return {
				valid: false,
				error: `File ${file.name} is not a valid Define-XML file`,
				fileType: FileType.DEFINEXML
			};
		}
		return { valid: true, fileType: FileType.DEFINEXML };
	}

	async processFile(
		file: File,
		onProgress?: (state: DatasetLoadingState) => void
	): Promise<ProcessingResult> {
		const startTime = performance.now();

		// Handle file I/O and progress reporting
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
			const text = await file.text();

			if (onProgress) {
				onProgress({
					status: 'processing',
					fileName: file.name,
					progress: 50,
					totalSize: file.size,
					loadedSize: text.length
				});
			}

			// Delegate to pure data processor
			const result = await this.dataProcessor.process(text);

			if (onProgress) {
				onProgress({
					status: 'processing',
					fileName: file.name,
					progress: 90,
					totalSize: file.size,
					loadedSize: text.length
				});
			}

			try {
				let enhancedData = graphXML.enhance(result.data);
				// Store both enhanced and original
				result.graphData = enhancedData?.graphData || null;
				result.enhancedDefineXML = enhancedData || null;
			} catch (graphError) {
				console.error('[DefineXMLProcessor] Graph enhancement failed:', graphError);
				// Continue without enhancement
			}

			// Add file-specific metadata
			const finalResult = {
				...result,
				metrics: {
					uploadTime: (performance.now() - startTime) / 1000,
					fileSize: file.size
				}
			};

			if (onProgress) {
				onProgress({
					status: 'complete',
					fileName: file.name,
					progress: 100,
					totalSize: file.size,
					loadedSize: text.length
				});
			}

			console.log('[DefineXMLProcessor] Processing complete:', {
				success: finalResult.success,
				ADaM: finalResult.ADaM,
				SDTM: finalResult.SDTM,
				hasGraphData: !!finalResult.graphData,
				hasEnhancedData: !!finalResult.enhancedDefineXML,
				itemGroupsCount: finalResult.data?.ItemGroups?.length || 0,
				processingTime: finalResult.processingTime
			});

			return finalResult;
		} catch (error) {
			console.error('[DefineXMLProcessor] Processing error:', error);

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
