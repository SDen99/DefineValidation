/**
 * Composable for handling file upload logic
 * Separates business logic from UI components for better testability
 */
import { FileImportManager, type FileImportManagerOptions } from '$lib/core/services/FileImportManager';
import * as errorState from '$lib/core/state/errorState.svelte.ts';
import type { ServiceContainer } from '$lib/core/types/types';

export interface FileUploadResult {
	success: boolean;
	processedFiles: number;
	errors: string[];
}

export function createFileUploadHandler(container: ServiceContainer | null, fileManagerOptions?: FileImportManagerOptions) {
	let fileManager = $state<FileImportManager | null>(null);

	// Initialize file manager when container is available
	$effect(() => {
		if (container) {
			fileManager = new FileImportManager(container, fileManagerOptions);
		}
	});

	const validateAndProcessFiles = async (files: FileList | File[]): Promise<FileUploadResult> => {
		if (!fileManager) {
			const error = 'File manager is not yet available.';
			errorState.logWarning(error);
			return { success: false, processedFiles: 0, errors: [error] };
		}

		const fileArray = Array.from(files);
		const errors: string[] = [];

		// Validate all files first
		const validFiles = fileArray.filter((file) => {
			const validation = fileManager!.validateFile(file);
			if (!validation.valid && validation.error) {
				errors.push(validation.error);
				errorState.logWarning(validation.error);
			}
			return validation.valid;
		});

		if (validFiles.length === 0) {
			return { success: false, processedFiles: 0, errors };
		}

		// Process valid files
		const results = await Promise.allSettled(
			validFiles.map((file) => fileManager!.processFile(file))
		);

		// Collect processing errors
		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				const fileName = validFiles[index].name;
				const error = `Failed to process ${fileName}: ${result.reason}`;
				errors.push(error);
				errorState.logError(new Error(error), { context: 'File processing' });
			}
		});

		const successfulProcesses = results.filter((r) => r.status === 'fulfilled').length;

		return {
			success: successfulProcesses > 0,
			processedFiles: successfulProcesses,
			errors
		};
	};

	const handleFileChangeEvent = async (event: Event): Promise<FileUploadResult> => {
		const files = (event.target as HTMLInputElement).files;
		if (!files?.length) {
			return { success: false, processedFiles: 0, errors: ['No files selected'] };
		}
		return validateAndProcessFiles(files);
	};

	const handleFilesDrop = async (files: File[]): Promise<FileUploadResult> => {
		return validateAndProcessFiles(files);
	};

	const loadSampleFile = async (url: string, filename: string): Promise<FileUploadResult> => {
		if (!fileManager) {
			const error = 'File manager is not available.';
			errorState.logWarning(error);
			return { success: false, processedFiles: 0, errors: [error] };
		}

		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.statusText}`);
			}

			const blob = await response.blob();
			const file = new File([blob], filename, {
				type: filename.endsWith('.xml') ? 'application/xml' : 'application/octet-stream'
			});

			const result = await fileManager.processFile(file);
			if (!result.success) {
				throw result.error || new Error('Unknown processing error.');
			}

			console.log(`Sample file ${filename} loaded and processed.`);
			return { success: true, processedFiles: 1, errors: [] };
		} catch (error) {
			const errorMessage = `Failed to load sample file: ${error}`;
			errorState.logError(error as Error, { context: 'Sample file loading' });
			return { success: false, processedFiles: 0, errors: [errorMessage] };
		}
	};

	return {
		// State
		get isReady() {
			return fileManager !== null;
		},

		// Actions
		handleFileChangeEvent,
		handleFilesDrop,
		loadSampleFile,
		validateAndProcessFiles
	};
}

export type FileUploadHandler = ReturnType<typeof createFileUploadHandler>;
