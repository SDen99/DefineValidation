/**
 * Svelte-specific adapter for dataset domain package
 * Provides reactive state using Svelte 5 runes while delegating
 * business logic to the framework-agnostic dataset-domain package
 */
import {
	type DatasetRepository,
	PlainDatasetRepository,
	DatasetSelectionService,
	type Dataset,
	type SelectionResult,
	type ProcessingStats as DomainProcessingStats
} from '@sden99/dataset-domain';
import type { DatasetLoadingState, ProcessingStats } from '../types/types';
import { DatasetService } from '../services/datasetService';
import * as appState from './appState.svelte';

/**
 * Svelte-reactive implementation of DatasetRepository
 * Wraps PlainDatasetRepository with Svelte runes
 */
export class SvelteDatasetRepository implements DatasetRepository {
	private plainRepo = new PlainDatasetRepository();

	// Reactive state using Svelte 5 runes
	// Use $state.raw to avoid deep-proxying large dataset .data arrays (74K+ rows)
	private datasets = $state.raw<Record<string, Dataset>>({});
	private originalFilenames = $state<Record<string, string>>({});

	findById(id: string): Dataset | null {
		return this.datasets[id] || null;
	}

	findAll(): Dataset[] {
		return Object.values(this.datasets);
	}

	save(dataset: Dataset): void {
		this.datasets = { ...this.datasets, [dataset.fileName]: dataset };
		this.plainRepo.save(dataset);

		// Track normalized filename mapping
		const normalized = this.normalizeId(dataset.fileName);
		if (normalized !== dataset.fileName) {
			this.originalFilenames[normalized] = dataset.fileName;
		}
	}

	remove(id: string): void {
		this.plainRepo.remove(id);

		const normalized = this.normalizeId(id);
		const updated = { ...this.datasets };
		Object.keys(updated).forEach((key) => {
			if (this.normalizeId(key) === normalized) {
				delete updated[key];
			}
		});
		this.datasets = updated;

		delete this.originalFilenames[normalized];
	}

	clear(): void {
		this.plainRepo.clear();
		this.datasets = {};
		Object.keys(this.originalFilenames).forEach((key) => delete this.originalFilenames[key]);
	}

	exists(id: string): boolean {
		return this.datasets[id] !== undefined;
	}

	count(): number {
		return Object.keys(this.datasets).length;
	}

	getOriginalFilename(normalizedId: string): string | undefined {
		return this.originalFilenames[normalizedId];
	}

	setOriginalFilename(normalizedId: string, originalName: string): void {
		this.originalFilenames[normalizedId] = originalName;
	}

	// Reactive getters for Svelte components
	getReactiveDatasets() {
		return this.datasets;
	}

	getReactiveOriginalFilenames() {
		return this.originalFilenames;
	}

	private normalizeId(id: string): string {
		return id.replace(/\.(sas7bdat|xpt|xml|json)$/i, '').toLowerCase();
	}
}

/**
 * Svelte-specific dataset state manager
 * Combines domain logic with reactive state management
 */
export class SvelteDatasetStateManager {
	private repository: SvelteDatasetRepository;
	private selectionService: DatasetSelectionService;

	// Reactive state using Svelte 5 runes
	private selectedDatasetId = $state<{ value: string | null }>({ value: null });
	private selectedDomain = $state<{ value: string | null }>({ value: null });
	private loadingStates = $state<Record<string, DatasetLoadingState>>({});
	private processingStats = $state<{ value: ProcessingStats | null }>({ value: null });

	constructor() {
		this.repository = new SvelteDatasetRepository();
		this.selectionService = new DatasetSelectionService(this.repository);
	}

	// ============================================
	// SELECTION OPERATIONS
	// ============================================

	selectDataset(id: string | null, domain: string | null = null): void {
		const result = this.selectionService.selectDataset(id, domain);

		if (result.success) {
			this.selectedDatasetId.value = result.selectedId;
			this.selectedDomain.value = result.selectedDomain;

			// Set view mode using per-dataset tab memory
			const availableViews = this.selectionService.getAvailableViews(
				result.selectedId,
				result.selectedDomain
			);
			const datasetKey = `${result.selectedId}_${result.selectedDomain || ''}`;

			// Check if we have a remembered tab preference for this specific dataset
			const rememberedTab = appState.getRememberedTabForDataset(datasetKey);
			const firstAvailableView = this.getFirstAvailableView(availableViews);

			let targetViewMode: 'data' | 'metadata' | null = null;

			// Priority: 1) Remembered tab (if valid), 2) First available
			if (rememberedTab && availableViews[rememberedTab]) {
				targetViewMode = rememberedTab;
				console.log(
					`[SvelteDatasetStateManager] Using remembered tab for ${datasetKey}: ${rememberedTab}`
				);
			} else if (firstAvailableView) {
				targetViewMode = firstAvailableView;
				console.log(
					`[SvelteDatasetStateManager] No valid remembered tab, using first available: ${firstAvailableView}`
				);
			}

			if (targetViewMode) {
				appState.setViewMode(targetViewMode, datasetKey);
			}

			// Persist selection to localStorage
			this.saveSelectionToStorage(result.selectedId, result.selectedDomain);

			if (result.selectedId) {
				console.log(`[SvelteDatasetStateManager] Dataset selected: ${result.selectedId}`, {
					availableViews,
					firstAvailableView
				});
			} else {
				console.log(`[SvelteDatasetStateManager] Dataset selection cleared`);
			}
		} else {
			console.warn(`[SvelteDatasetStateManager] Selection failed: ${result.error}`);
		}
	}

	private saveSelectionToStorage(selectedId: string | null, selectedDomain: string | null): void {
		if (typeof window === 'undefined') return;

		try {
			const selectionState = {
				selectedId,
				selectedDomain,
				timestamp: Date.now()
			};
			localStorage.setItem('datasetViewer.lastSelection', JSON.stringify(selectionState));
			console.log(`[SvelteDatasetStateManager] Saved selection to storage:`, selectionState);
		} catch (error) {
			console.warn('[SvelteDatasetStateManager] Failed to save selection to storage:', error);
		}
	}

	restoreSelectionFromStorage(): {
		selectedId: string | null;
		selectedDomain: string | null;
	} | null {
		if (typeof window === 'undefined') return null;

		try {
			const stored = localStorage.getItem('datasetViewer.lastSelection');
			if (!stored) return null;

			const selectionState = JSON.parse(stored);
			console.log(`[SvelteDatasetStateManager] Restored selection from storage:`, selectionState);
			return {
				selectedId: selectionState.selectedId,
				selectedDomain: selectionState.selectedDomain
			};
		} catch (error) {
			console.warn('[SvelteDatasetStateManager] Failed to restore selection from storage:', error);
			return null;
		}
	}

	// ============================================
	// DATASET OPERATIONS
	// ============================================

	setDatasets(newDatasets: Record<string, Dataset>): void {
		console.log(`[SvelteDatasetStateManager] Loading ${Object.keys(newDatasets).length} datasets`);

		this.repository.clear();

		Object.entries(newDatasets).forEach(([key, dataset]) => {
			// Ensure dataset has fileName property
			if (!dataset.fileName) {
				dataset.fileName = key;
			}
			this.repository.save(dataset);
		});

		console.log(
			`[SvelteDatasetStateManager] Successfully loaded ${this.repository.count()} datasets`
		);
	}

	addDataset(dataset: Dataset): void {
		this.repository.save(dataset);

		if (!this.selectedDatasetId.value) {
			this.selectDataset(dataset.fileName, null);
		}
	}

	updateDataset(id: string, updates: Partial<Dataset>): void {
		const existing = this.repository.findById(id);
		if (!existing) return;

		const updated = { ...existing, ...updates };
		this.repository.save(updated);
	}

	clearDatasets(): void {
		this.repository.clear();
		this.selectedDatasetId.value = null;
		this.selectedDomain.value = null;
		this.clearAllLoadingStates();
		this.processingStats.value = null;
	}

	async deleteDataset(id: string): Promise<void> {
		// Special handling for Define.XML files: delete only the exact file to preserve .sas7bdat data independence
		const isDefineXML = id.toLowerCase().endsWith('.xml');

		const matchingDatasets = this.repository
			.findAll()
			.filter((dataset) =>
				isDefineXML
					? dataset.fileName === id  // Exact match for XML files
					: this.normalizeId(dataset.fileName) === this.normalizeId(id)  // Normalized match for .sas7bdat
			);

		console.log(`[SvelteDatasetStateManager] Deleting dataset: ${id} (isDefineXML: ${isDefineXML})`);
		console.log(`[SvelteDatasetStateManager] Found ${matchingDatasets.length} matching datasets to delete`);

		try {
			const datasetService = DatasetService.getInstance();
			for (const dataset of matchingDatasets) {
				console.log(`[SvelteDatasetStateManager] Removing from IndexedDB: ${dataset.fileName}`);
				await datasetService.removeDataset(dataset.fileName);
			}
		} catch (error) {
			console.error('Error removing from IndexedDB:', error);
		}

		this.repository.remove(id);

		if (
			this.selectedDatasetId.value &&
			this.normalizeId(this.selectedDatasetId.value) === this.normalizeId(id)
		) {
			this.selectDataset(null, null);
		}
	}

	async deleteDefineXML(type: 'SDTM' | 'ADaM'): Promise<void> {
		console.log(`[SvelteDatasetStateManager] Deleting ${type} Define.xml`);

		// Find the Define.xml file of the specified type
		let fileToDelete: string | null = null;
		const allDatasets = this.repository.getReactiveDatasets();

		for (const [fileName, dataset] of Object.entries(allDatasets)) {
			if (
				dataset.data &&
				typeof dataset.data === 'object' &&
				'MetaData' in dataset.data &&
				(dataset.data as any).MetaData?.OID?.includes(type)
			) {
				fileToDelete = fileName;
				break;
			}
		}

		if (!fileToDelete) {
			console.warn(`[SvelteDatasetStateManager] No ${type} Define.xml file found to delete.`);
			return;
		}

		try {
			await this.deleteDataset(fileToDelete);
			console.log(
				`[SvelteDatasetStateManager] Successfully deleted ${type} Define.xml: ${fileToDelete}`
			);
		} catch (error) {
			console.error(`[SvelteDatasetStateManager] Failed to delete ${type} Define.xml:`, error);
			throw error;
		}
	}

	// ============================================
	// LOADING STATE MANAGEMENT
	// ============================================

	setLoadingState(fileName: string, state: DatasetLoadingState): void {
		this.loadingStates[fileName] = state;
	}

	clearLoadingState(fileName: string): void {
		delete this.loadingStates[fileName];
	}

	clearAllLoadingStates(): void {
		Object.keys(this.loadingStates).forEach((key) => delete this.loadingStates[key]);
	}

	setLoadingError(fileName: string, error: Error): void {
		this.loadingStates[fileName] = {
			status: 'error',
			fileName,
			progress: 0,
			totalSize: 0,
			loadedSize: 0,
			error: error.message
		};
	}

	setProcessingStats(stats: ProcessingStats): void {
		this.processingStats.value = stats;
	}

	// ============================================
	// GETTERS (Reactive State Access)
	// ============================================

	getSelectedDatasetId(): string | null {
		return this.selectedDatasetId.value;
	}

	getSelectedDomain(): string | null {
		return this.selectedDomain.value;
	}

	getProcessingStats(): ProcessingStats | null {
		return this.processingStats.value;
	}

	getLoadingStates(): Record<string, DatasetLoadingState> {
		return this.loadingStates;
	}

	getDatasets(): Record<string, Dataset> {
		return this.repository.getReactiveDatasets();
	}

	getOriginalFilenames() {
		return this.repository.getReactiveOriginalFilenames();
	}

	// Derived state getters that delegate to the selection service
	getDefineXmlInfo() {
		return this.selectionService.getDefineXMLInfo();
	}

	getActiveDefineInfo() {
		return this.selectionService.getActiveDefineInfo(
			this.selectedDatasetId.value,
			this.selectedDomain.value
		);
	}

	getActiveItemGroupMetadata() {
		return this.selectionService.getActiveItemGroupMetadata(
			this.selectedDatasetId.value,
			this.selectedDomain.value
		);
	}

	getAvailableDatasets() {
		return this.selectionService.getAvailableDatasets();
	}

	getAvailableViews() {
		return this.selectionService.getAvailableViews(
			this.selectedDatasetId.value,
			this.selectedDomain.value
		);
	}

	getIsBdsDataset(): boolean {
		const metadata = this.getActiveItemGroupMetadata();
		return metadata?.Class === 'BASIC DATA STRUCTURE';
	}

	private getFirstAvailableView(views: {
		data: boolean;
		metadata: boolean;
		VLM: boolean;
	}): 'data' | 'metadata' | null {
		if (views.data) return 'data';
		if (views.metadata) return 'metadata';
		return null;
	}

	private normalizeId(id: string): string {
		return id.replace(/\.(sas7bdat|xpt|xml|json)$/i, '').toLowerCase();
	}
}
