/**
 * Dataset State - Facade/Adapter for Dataset Management
 *
 * STATE MANAGEMENT PATTERN: Facade with Multiple Export Styles
 * ==============================================================
 * This module is a FACADE that wraps SvelteDatasetStateManager and provides
 * multiple ways to access the same data for backward compatibility.
 *
 * WHY THIS PATTERN?
 * - Provides a stable public API while the internal implementation can change
 * - Supports both function-based and .value-based access patterns
 * - Maintains backward compatibility with older code
 * - Delegates actual state management to SvelteDatasetStateManager class
 *
 * ARCHITECTURE:
 *   Components
 *      ↓ (import)
 *   dataState (THIS FILE - Facade)
 *      ↓ (delegates to)
 *   SvelteDatasetStateManager (Svelte 5 runes wrapper)
 *      ↓ (uses)
 *   DatasetRepository (domain logic from @sden99/dataset-domain)
 *
 * RECOMMENDED USAGE IN COMPONENTS:
 *   import * as dataState from '$lib/core/state/dataState.svelte.ts';
 *
 *   // Preferred: Function-based access
 *   let datasets = $derived(dataState.getDatasets());
 *   let selectedId = $derived(dataState.getSelectedDatasetId());
 *
 *   // Also supported: .value access (for backward compatibility)
 *   let selectedId = $derived(dataState.selectedDatasetId.value);
 *
 * NOTE: The .value pattern and function pattern return the same data.
 * Use functions for new code; .value is kept for legacy compatibility.
 */
import { SvelteDatasetStateManager } from './SvelteDatasetStateManager.svelte.ts';
import { normalizeDatasetId } from '@sden99/dataset-domain';
import {
	initializeVLMProcessing,
	getActiveVLMTableData,
	getActiveVariables,
	getVLMVariables
} from '@sden99/vlm-processing';
import { globalStateProvider } from './GlobalStateProvider.js';
import { DataStateProviderImpl } from './DataStateProvider';
// Note: Metadata components are now initialized in +layout.svelte with the proper state provider
import * as workerState from './workerState.svelte';

// ============================================
// INITIALIZE STATE MANAGER
// ============================================
const stateManager = new SvelteDatasetStateManager();

// Initialize VLM processing service with global state provider
initializeVLMProcessing(globalStateProvider);

// ============================================
// INJECT DEPENDENCIES INTO WORKER STATE
// ============================================
// Create provider that wraps stateManager getters
const dataStateProvider = new DataStateProviderImpl(
	() => stateManager.getSelectedDatasetId(),
	() => stateManager.getSelectedDomain(),
	() => stateManager.getDatasets()
);

// Inject into workerState IMMEDIATELY during module initialization
// This ensures the provider is available before any worker operations
workerState.setDataStateProvider(dataStateProvider);
console.log('[dataState] ✅ Injected DataStateProvider into workerState');

// Note: Metadata processing is now initialized in +layout.svelte

// ============================================
// DATASET OPERATIONS
// ============================================
export const selectDataset = (id: string | null, domain: string | null = null) => {
	stateManager.selectDataset(id, domain);
};

export const setDatasets = (newDatasets: Record<string, any>) => {
	stateManager.setDatasets(newDatasets);
};

export const addDataset = (dataset: any) => {
	stateManager.addDataset(dataset);
};

export const updateDataset = (id: string, updates: any) => {
	stateManager.updateDataset(id, updates);
};

export const clearDatasets = () => {
	stateManager.clearDatasets();
};

export const deleteDataset = async (id: string) => {
	await stateManager.deleteDataset(id);
};

export const deleteDefineXML = async (type: 'SDTM' | 'ADaM') => {
	await stateManager.deleteDefineXML(type);
};

// ============================================
// SELECTION PERSISTENCE
// ============================================
export const restoreLastSelection = () => {
	const restored = stateManager.restoreSelectionFromStorage();
	if (restored && restored.selectedId) {
		// Use selectDatasetWithWorker to ensure worker state is also updated
		selectDatasetWithWorker(restored.selectedId, restored.selectedDomain);
		return true;
	}
	return false;
};

// ============================================
// LOADING STATE OPERATIONS
// ============================================
export const setLoadingState = (fileName: string, state: any) => {
	stateManager.setLoadingState(fileName, state);
};

export const clearLoadingState = (fileName: string) => {
	stateManager.clearLoadingState(fileName);
};

export const setLoadingError = (fileName: string, error: Error) => {
	stateManager.setLoadingError(fileName, error);
};

export const setProcessingStats = (stats: any) => {
	stateManager.setProcessingStats(stats);
};

// ============================================
// STATE GETTERS
// ============================================
export const getSelectedDatasetId = () => stateManager.getSelectedDatasetId();
export const getSelectedDomain = () => stateManager.getSelectedDomain();
export const getProcessingStats = () => stateManager.getProcessingStats();
export const getLoadingStates = () => stateManager.getLoadingStates();
export const getDefineXmlInfo = () => stateManager.getDefineXmlInfo();
export const getActiveDefineInfo = () => stateManager.getActiveDefineInfo();
export const getActiveItemGroupMetadata = () => stateManager.getActiveItemGroupMetadata();
export const getAvailableDatasets = () => {
	const result = stateManager.getAvailableDatasets();
	console.log(`[dataState] getAvailableDatasets returning:`, {
		count: result.length,
		first3: result.slice(0, 3).map((d) => ({ id: d.id, name: d.name }))
	});
	return result;
};
export const getAvailableViews = () => stateManager.getAvailableViews();
export const getIsBdsDataset = () => stateManager.getIsBdsDataset();
export const getDatasets = () => {
	const result = stateManager.getDatasets();
	// Reduced logging to prevent reactivity noise
	console.log(`[dataState] getDatasets called - ${Object.keys(result).length} datasets`);
	return result;
};
export const getOriginalFilenames = () => stateManager.getOriginalFilenames();

// Utility functions
export const getItemGroupMetadata = (name: string | null | undefined) => {
	if (!name) return undefined;
	const defineXMLInfo = stateManager.getDefineXmlInfo();
	const normalizedName = normalizeDatasetId(name);

	const allDefines = [defineXMLInfo.SDTM, defineXMLInfo.ADaM].filter(Boolean);
	for (const define of allDefines) {
		if (!define?.ItemGroups) continue;
		const found = define.ItemGroups.find(
			(g) => normalizeDatasetId(g.SASDatasetName || g.Name || '') === normalizedName
		);
		if (found) return found;
	}
	return undefined;
};

export const getOriginalFilename = (normalizedId: string): string | undefined => {
	return stateManager.getOriginalFilenames()[normalizedId];
};

export const getDatasetState = (fileName: string) => {
	const normalizedName = normalizeDatasetId(fileName);
	const loadingStates = stateManager.getLoadingStates();
	const loadingState = loadingStates[fileName] || null;
	const datasets = stateManager.getDatasets();
	const dataset = Object.values(datasets).find(
		(d) => normalizeDatasetId(d.fileName) === normalizedName
	);
	const hasData = !!(dataset?.data && Array.isArray(dataset.data));
	const defineXMLInfo = stateManager.getDefineXmlInfo();

	const hasMetadata =
		!!defineXMLInfo.SDTM?.ItemGroups?.some(
			(g) => normalizeDatasetId(g.SASDatasetName || g.Name || '') === normalizedName
		) ||
		!!defineXMLInfo.ADaM?.ItemGroups?.some(
			(g) => normalizeDatasetId(g.SASDatasetName || g.Name || '') === normalizedName
		);

	return {
		isLoading: loadingState?.status === 'processing',
		hasData,
		hasMetadata,
		error: loadingState?.status === 'error' ? loadingState.error : undefined,
		progress: loadingState?.progress || 0
	};
};

export const getActiveDefineInfoWithItemGroup = () => {
	const selectedId = stateManager.getSelectedDatasetId();
	const selectedDomain = stateManager.getSelectedDomain();
	const name = selectedDomain || selectedId;

	if (!name) return { define: null, itemGroup: null };

	const normalizedName = normalizeDatasetId(name);
	const defineXMLInfo = stateManager.getDefineXmlInfo();

	let defineData = null;
	let defineFileId = null;

	if (
		defineXMLInfo.ADaM?.ItemGroups.some(
			(g) => normalizeDatasetId(g.SASDatasetName || g.Name || '') === normalizedName
		)
	) {
		defineData = defineXMLInfo.ADaM;
		defineFileId = defineXMLInfo.adamId;
	} else if (
		defineXMLInfo.SDTM?.ItemGroups.some(
			(g) => normalizeDatasetId(g.SASDatasetName || g.Name || '') === normalizedName
		)
	) {
		defineData = defineXMLInfo.SDTM;
		defineFileId = defineXMLInfo.sdtmId;
	}

	if (!defineData || !defineFileId) {
		return { define: null, itemGroup: null };
	}

	const datasets = stateManager.getDatasets();
	const defineDataset = datasets[defineFileId];
	if (!defineDataset?.enhancedDefineXML) {
		return { define: defineData, itemGroup: null };
	}

	const enhancedItemGroups = defineDataset.enhancedDefineXML.enhancedItemGroups;
	if (!enhancedItemGroups) {
		return { define: defineDataset.enhancedDefineXML.raw || defineData, itemGroup: null };
	}

	let itemGroup = null;
	for (const [, ig] of enhancedItemGroups) {
		if (normalizeDatasetId(ig.sasDatasetName || ig.name) === normalizedName) {
			itemGroup = ig;
			break;
		}
	}

	return {
		define: defineDataset.enhancedDefineXML.raw || defineData,
		itemGroup: itemGroup || null
	};
};

// ============================================
// VLM AND WORKER STATE EXPORTS
// ============================================
export { getActiveVLMTableData, getActiveVariables, getVLMVariables };

export const {
	dataEngine,
	initializeWorker,
	setVisibleRange,
	sendDataToWorkerInChunks,
	requestSortedRows,
	handleDatasetSelection,
	cleanupWorker,
	getDataEngine,
	isWorkerInitialized,
	getWorkerStatus
} = workerState;

export function selectDatasetWithWorker(id: string | null, domain: string | null = null) {
	selectDataset(id, domain);
	workerState.handleDatasetSelection(id, domain);
}

// ============================================
// BACKWARDS COMPATIBILITY LAYER
// ============================================
export const selectedDatasetId = {
	get value() {
		return getSelectedDatasetId();
	}
};

export const selectedDomain = {
	get value() {
		return getSelectedDomain();
	}
};

export const processingStats = {
	get value() {
		return getProcessingStats();
	}
};

// ============================================
// REMOVED: Redundant function wrappers
// ============================================
// The following wrapper functions have been removed as they were redundant:
// - datasets() → Use getDatasets() instead
// - loadingStates() → Use getLoadingStates() instead
// - defineXmlInfo() → Use getDefineXmlInfo() instead
// - activeDefineInfo() → Use getActiveDefineInfo() instead
// - activeItemGroupMetadata() → Use getActiveItemGroupMetadata() instead
// - availableDatasets() → Use getAvailableDatasets() instead
// - availableViews() → Use getAvailableViews() instead
// - getAllDatasets() → Use getDatasets() instead
//
// All code has been updated to use the direct getX() functions (lines 110-133).

// Export the normalize function
export { normalizeDatasetId };

// ============================================
// DEBUG HELPERS
// ============================================
if (typeof window !== 'undefined') {
	// @ts-ignore - for debugging
	window.__dataState = {
		// New package-based architecture
		stateManager,

		// Legacy debug interface
		getDatasets,
		getSelectedDatasetId,
		getSelectedDomain,
		getLoadingStates,
		getOriginalFilenames,
		getDefineXmlInfo,
		getVLMVariables,
		getActiveVariables,
		getActiveVLMTableData,
		dataEngine: workerState.dataEngine,
		getActiveDefineInfo,
		getActiveItemGroupMetadata,
		getIsBdsDataset,
		getAvailableViews,
		isWorkerInitialized: workerState.isWorkerInitialized,
		getWorkerStatus: workerState.getWorkerStatus
	};
}
