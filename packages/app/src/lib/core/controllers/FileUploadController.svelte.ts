/**
 * Controller for coordinating file upload UI interactions
 * Acts as a bridge between UI events and business logic
 */
import {
	createFileUploadHandler,
	type FileUploadHandler,
	type FileUploadResult
} from '$lib/core/composables/useFileUpload.svelte.ts';
import type { FileImportManagerOptions } from '$lib/core/services/FileImportManager';
import * as dataState from '$lib/core/state/dataState.svelte.ts';
import { statePersistenceService } from '$lib/core/services/StatePersistenceService';
import * as appState from '$lib/core/state/appState.svelte.ts';
import type { ServiceContainer } from '$lib/core/types/types';

export class FileUploadController {
	private fileHandler: FileUploadHandler;
	private container: ServiceContainer | null;

	constructor(container: ServiceContainer | null, fileManagerOptions?: FileImportManagerOptions) {
		this.container = container;
		this.fileHandler = createFileUploadHandler(container, fileManagerOptions);
	}

	// UI Event Handlers with error boundaries
	async onFileInputChange(event: Event): Promise<FileUploadResult> {
		try {
			const result = await this.fileHandler.handleFileChangeEvent(event);
			this.handleUploadResult(result);
			return result;
		} catch (error) {
			return this.handleUnexpectedError(error, 'file input change');
		}
	}

	async onFilesDrop(files: File[]): Promise<FileUploadResult> {
		try {
			const result = await this.fileHandler.handleFilesDrop(files);
			this.handleUploadResult(result);
			return result;
		} catch (error) {
			return this.handleUnexpectedError(error, 'file drop');
		}
	}

	async onLoadSampleFile(
		url: string = '/defineV21-ADaM.xml',
		filename: string = 'defineV21-ADaM.xml'
	): Promise<FileUploadResult> {
		try {
			const result = await this.fileHandler.loadSampleFile(url, filename);
			this.handleUploadResult(result);
			return result;
		} catch (error) {
			return this.handleUnexpectedError(error, 'sample file loading');
		}
	}

	// UI State Helpers
	get isReady(): boolean {
		return this.fileHandler.isReady;
	}

	get isLoading(): boolean {
		return Object.keys(dataState.getLoadingStates()).length > 0;
	}

	// State persistence trigger
	triggerStatePersistence(): void {
		const hasPersistableData = Object.keys(dataState.getDatasets()).length > 0 || this.isLoading;

		if (hasPersistableData) {
			statePersistenceService.saveState({
				uiPreferences: appState.getUIPreferencesSnapshot(dataState.getDatasets())
			});
		}
	}

	// Validation helpers for UI
	validateFileSelection(files: FileList | null): { valid: boolean; message?: string } {
		if (!this.isReady) {
			return { valid: false, message: 'File upload system is not ready' };
		}

		if (!files || files.length === 0) {
			return { valid: false, message: 'No files selected' };
		}

		return { valid: true };
	}

	// Private error handling methods
	private handleUploadResult(result: FileUploadResult): void {
		if (result.success && result.processedFiles > 0) {
			console.log(`Successfully processed ${result.processedFiles} file(s)`);
		}

		if (result.errors.length > 0) {
			console.warn('Upload completed with errors:', result.errors);
		}
	}

	private handleUnexpectedError(error: unknown, context: string): FileUploadResult {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const fullMessage = `Unexpected error during ${context}: ${errorMessage}`;

		console.error(fullMessage, error);

		return {
			success: false,
			processedFiles: 0,
			errors: [fullMessage]
		};
	}
}
