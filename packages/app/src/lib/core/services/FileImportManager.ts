// packages/app/src/lib/core/services/FileImportManager.ts
import type { DatasetLoadingState, ServiceContainer, Dataset } from '$lib/core/types/types';
import * as dataState from '$lib/core/state/dataState.svelte.ts';
import { FileType, type FileProcessor } from '$lib/core/types/fileTypes';
import { Sas7bdatProcessor } from '$lib/core/processors/sas7bdat/Sas7bdatProcessor';
import { DefineXMLProcessor } from '$lib/core/processors/defineXML/DefineXMLProcessor';
import { DatasetJsonProcessor } from '$lib/core/processors/datasetjson/DatasetJsonProcessor';
import { YamlRuleProcessor } from '$lib/core/processors/yaml/YamlRuleProcessor';
import type { WorkerPool } from '$lib/core/services/workerPool';
import { createDatasetFromProcessingResult as createDataset } from '@sden99/dataset-domain';

import { ruleState } from '$lib/core/state/ruleState.svelte';

export const FILE_CONSTRAINTS = {
	MAX_SIZE: 500 * 1024 * 1024,
	ALLOWED_EXTENSIONS: ['.sas7bdat', '.xpt', '.xml', '.json', '.yaml', '.yml']
} as const;

export interface FileImportManagerOptions {
	/** Called after a dataset is successfully processed and stored */
	onDatasetReady?: () => void;
}

export class FileImportManager {
	private serviceContainer: ServiceContainer;
	private processors: Map<FileType, FileProcessor>;
	private yamlProcessor: YamlRuleProcessor;
	private workerPool: WorkerPool | null = null;
	private onDatasetReady?: () => void;

	constructor(serviceContainer: ServiceContainer, options?: FileImportManagerOptions) {
		this.serviceContainer = serviceContainer;
		this.workerPool = serviceContainer.getWorkerPool();
		this.onDatasetReady = options?.onDatasetReady;
		this.yamlProcessor = new YamlRuleProcessor();
		this.processors = new Map<FileType, FileProcessor>([
			[FileType.SAS7BDAT, new Sas7bdatProcessor(this.workerPool)],
			[FileType.DEFINEXML, new DefineXMLProcessor()],
			[FileType.DATASET_JSON, new DatasetJsonProcessor()]
		]);
	}

	validateFile(file: File): { valid: boolean; error?: string } {
		if (file.size > FILE_CONSTRAINTS.MAX_SIZE) {
			return {
				valid: false,
				error: `File ${file.name} exceeds maximum size limit of 500MB`
			};
		}

		// Check YAML rule files
		const yamlResult = this.yamlProcessor.validateFile(file);
		if (yamlResult.valid) return yamlResult;

		// Try each processor until we find one that accepts the file
		for (const processor of this.processors.values()) {
			const result = processor.validateFile(file);
			if (result.valid) return result;
		}

		return {
			valid: false,
			error: `File ${file.name} is not a supported file type`
		};
	}

	async processFile(file: File): Promise<{ success: boolean; error?: Error }> {
		dataState.setLoadingState(file.name, {
			status: 'processing',
			fileName: file.name,
			progress: 0,
			totalSize: file.size,
			loadedSize: 0
		});

		try {
			const fileName = file.name.toLowerCase();

			// YAML rule files use a separate processing path
			if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
				const result = await this.yamlProcessor.processFile(file);
				ruleState.addRules(result.rules, result.warnings);
				dataState.clearLoadingState(file.name);
				// Trigger revalidation so imported rules run against existing datasets
				this.onDatasetReady?.();
				return { success: true };
			}

			const fileType = fileName.endsWith('.xml')
				? FileType.DEFINEXML
				: fileName.endsWith('.json')
				? FileType.DATASET_JSON
				: FileType.SAS7BDAT;

			const processor = this.processors.get(fileType);
			if (!processor) throw new Error(`No processor for ${file.name}`);

			const result = await processor.processFile(file, (state: DatasetLoadingState) => {
				dataState.setLoadingState(file.name, state);
			});

			await this.handleProcessingSuccess(file, result);
			return { success: true };
		} catch (error) {
			this.handleProcessingError(file, error);
			return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
		}
	}

	private async handleProcessingSuccess(file: File, result: any) {
		const datasetService = this.serviceContainer.getDatasetService();

		const domainDataset = createDataset(file, result);

		const datasetToStore: Dataset = {
			...domainDataset,
			details: domainDataset.details || null
		};

		await datasetService.addDataset(datasetToStore);
		const updatedDatasets = await datasetService.getAllDatasets();

		dataState.setDatasets(updatedDatasets);
		dataState.clearLoadingState(file.name);
		dataState.setProcessingStats(datasetToStore.processingStats);

		// Notify caller (e.g., for validation)
		this.onDatasetReady?.();

		// Auto-select the newly loaded dataset if:
		// 1. No dataset is currently selected, OR
		// 2. Current selection is a Define-XML and this is a tabular dataset
		const currentSelection = dataState.getSelectedDatasetId();
		const isTabularDataset = datasetToStore.data && Array.isArray(datasetToStore.data);
		const currentIsDefineXml = currentSelection?.toLowerCase().endsWith('.xml');

		if (!currentSelection || (currentIsDefineXml && isTabularDataset)) {
			dataState.selectDatasetWithWorker(datasetToStore.fileName, null);
		}
	}

	private handleProcessingError(file: File, error: unknown) {
		const finalError = error instanceof Error ? error : new Error(String(error));
		dataState.setLoadingError(file.name, finalError);
	}
}
