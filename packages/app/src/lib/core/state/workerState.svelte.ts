/**
 * Worker State Module - Web Worker communication and data processing
 * Handles worker initialization, data transfer, and result processing
 *
 * STATE MANAGEMENT PATTERN: Direct Object with Mutable Properties
 * ================================================================
 * This module uses the "direct object pattern" where the object itself is never reassigned,
 * only its properties are mutated.
 *
 * WHY THIS PATTERN?
 * - The `dataEngine` object reference remains stable (never reassigned)
 * - Only properties like `dataEngine.visibleRows` or `dataEngine.totalRows` are updated
 * - Svelte 5's deep reactivity tracks property mutations automatically
 * - No need for .value wrapper since we're not reassigning the object itself
 *
 * CORRECT USAGE IN COMPONENTS:
 *   import { dataEngine } from '$lib/core/state/workerState.svelte.ts';
 *
 *   // In Svelte 5 component - reads are automatically tracked:
 *   let rowCount = $derived(dataEngine.totalRows);
 *   let isLoading = $derived(dataEngine.isProcessing);
 *
 *   // Mutations (done by worker message handlers):
 *   dataEngine.visibleRows = newRows;  // ✅ Reactive
 *   dataEngine.totalRows = count;      // ✅ Reactive
 *
 * ANTI-PATTERN (don't do this):
 *   dataEngine = { ... };  // ❌ Would break reactivity across modules
 *
 * See: https://svelte.dev/docs/svelte/$state#Deep-state
 */
import { untrack } from 'svelte';
import type { DataStateProvider } from './DataStateProvider';
import { startMetric, endMetric } from '$lib/utils/performanceMetrics.svelte';

// ============================================
// DEPENDENCY INJECTION
// ============================================
let stateProvider: DataStateProvider | null = null;

/**
 * Initialize worker state with required dependencies
 * MUST be called during app initialization before any worker operations
 */
export function setDataStateProvider(provider: DataStateProvider): void {
	stateProvider = provider;
	console.log('[workerState] ✅ DataStateProvider injected');
}

// ============================================
// WORKER STATE
// ============================================
let dataWorker: Worker | null = null;
let pendingSelection: { id: string; domain: string | null } | null = null;

/**
 * Core worker data state - properties are mutated, object is never reassigned
 */
export const dataEngine = $state({
	visibleRows: [] as any[],
	totalRows: 0,
	isProcessing: false,
	isInitializing: true,
	visibleRange: { start: 0, end: 0 }
});

let visibleRange = { start: 0, end: 0 };

// ============================================
// WORKER INITIALIZATION AND HANDLING
// ============================================
export function initializeWorker(worker: Worker) {
	setDataWorker(worker);
	dataWorker = worker;

	worker.onmessage = (e) => {
		const { type, payload } = e.data;

		switch (type) {
			case 'DATASET_READY':
				dataEngine.totalRows = payload.totalRows;
				dataEngine.isInitializing = false;

				// 🔑 STRATEGY B: Do NOT auto-request rows
				// With Strategy B (lazy loading), worker data transfer is deferred until first sort
				// Automatically requesting 50 rows here would overwrite the sorted cache
				// The ClinicalDataAdapter will request sorted data when needed
				console.log(`[workerState] Dataset ready: ${payload.totalRows} rows (Strategy B: no auto-fetch)`);
				break;

			case 'SORTED_ROWS_RESULT':
				const receivedRows = payload.rows || [];
				console.log(`[workerState] ✅ Received ${receivedRows.length} rows from worker`);

				// Set visible rows directly - VirtualTable handles windowing
				dataEngine.visibleRows = receivedRows;

				console.log(
					`[workerState] ✅ Updated dataEngine.visibleRows: ${dataEngine.visibleRows.length} rows`
				);
				dataEngine.isProcessing = false;
				break;

			default:
				console.warn('[workerState] Unknown worker message:', type);
		}
	};

	worker.onerror = (error) => {
		console.error('[workerState] Worker error:', error);
		dataEngine.isProcessing = false;
		dataEngine.isInitializing = false;
	};

	if (pendingSelection) {
		const { id, domain } = pendingSelection;
		pendingSelection = null;

		// Note: Pending selection is handled by dataState.restoreLastSelection()
		// in +layout.svelte after worker is ready. This callback is no longer needed.
		console.log('[workerState] Pending selection deferred to app initialization');
	}

	return () => {
		setDataWorker(null);
		dataWorker?.terminate();
		dataWorker = null;
	};
}

function setDataWorker(worker: Worker | null) {
	dataWorker = worker;
}

// ============================================
// WORKER COMMUNICATION FUNCTIONS
// ============================================
export function setVisibleRange(range: { start: number; end: number }) {
	visibleRange = range;
}

export async function sendDataToWorkerInChunks(data: any[], datasetId: string) {
	const CHUNK_SIZE = 2000;
	const totalChunks = Math.ceil(data.length / CHUNK_SIZE);

	startMetric('send-data-chunks', 'worker', {
		datasetId,
		totalRows: data.length,
		totalChunks,
		chunkSize: CHUNK_SIZE
	});

	dataEngine.isInitializing = true;

	let start = 0;
	let chunkIndex = 0;

	while (start < data.length) {
		const end = Math.min(start + CHUNK_SIZE, data.length);
		const chunk = data.slice(start, end);
		const isLastChunk = end >= data.length;

		// Track individual chunk processing
		startMetric(`chunk-${chunkIndex}`, 'worker', {
			chunkIndex,
			rows: chunk.length,
			isLastChunk
		});

		const plainChunk = chunk.map((row) => ({ ...row }));

		dataWorker!.postMessage({
			type: 'DATA_CHUNK',
			payload: {
				datasetId,
				chunk: plainChunk,
				chunkIndex,
				totalChunks,
				isLastChunk
			}
		});

		endMetric(`chunk-${chunkIndex}`, 'worker');

		if (!isLastChunk) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}

		start = end;
		chunkIndex++;
	}

	endMetric('send-data-chunks', 'worker', {
		totalChunks: chunkIndex,
		totalRows: data.length
	});
}

export function requestSortedRows(sortConfig: any[], visibleRange: { start: number; end: number }) {
	// Validate dependencies are initialized
	if (!stateProvider) {
		console.error('[workerState] ❌ DataStateProvider not initialized. Call setDataStateProvider() first.');
		return;
	}

	const selectedId = stateProvider.getSelectedDatasetId();

	if (!dataWorker || !selectedId) {
		console.warn('[workerState] Cannot request rows: worker or dataset not available');
		return;
	}

	if (selectedId.toLowerCase().endsWith('.xml')) {
		console.log('[workerState] Skipping worker request - DefineXML is handled in-memory');
		return;
	}

	const rangeSize = visibleRange.end - visibleRange.start;
	console.log(
		`[workerState] Requesting tabular data rows: ${visibleRange.start}-${visibleRange.end}`
	);

	if (rangeSize > 1000) {
		console.warn(`[workerState] Large range request: ${rangeSize} rows`);
	}

	dataEngine.isProcessing = true;

	const serializedSortConfig = sortConfig.map((sort) => ({
		column: sort.column,
		direction: sort.direction
	}));

	const messagePayload = {
		datasetId: selectedId,
		sortConfig: serializedSortConfig,
		visibleRange: {
			start: visibleRange.start,
			end: visibleRange.end
		}
	};

	console.log(`[workerState] Sending to worker:`, messagePayload);
	debugSerializability(sortConfig, 'sortConfig');
	debugSerializability(visibleRange, 'visibleRange');
	debugSerializability(selectedId, 'datasetId');

	try {
		dataWorker.postMessage({
			type: 'GET_SORTED_ROWS',
			payload: messagePayload
		});
	} catch (error) {
		console.error('[workerState] Failed to send message to worker:', error);
		console.error('[workerState] Problematic payload:', messagePayload);
		dataEngine.isProcessing = false;

		if (serializedSortConfig.length > 0) {
			console.warn('[workerState] Retrying with empty sort config');
			dataWorker.postMessage({
				type: 'GET_SORTED_ROWS',
				payload: {
					datasetId: selectedId,
					sortConfig: [],
					visibleRange: messagePayload.visibleRange
				}
			});
		}
	}
}

function debugSerializability(obj: any, name: string) {
	try {
		const serialized = JSON.stringify(obj);
		const parsed = JSON.parse(serialized);
		console.log(`[DEBUG] ${name} is serializable:`, parsed);
		return true;
	} catch (error) {
		console.error(`[DEBUG] ${name} is NOT serializable:`, error);
		console.error(`[DEBUG] Problematic object:`, obj);
		return false;
	}
}

// ============================================
// DATASET SELECTION INTEGRATION
// ============================================
export function handleDatasetSelection(id: string | null, domain: string | null = null) {
	startMetric('worker-dataset-selection', 'worker', { id, domain });

	// Handle null selection (clear worker state)
	if (!id) {
		console.log(`[workerState] Dataset selection cleared`);
		dataEngine.totalRows = 0;
		dataEngine.visibleRows = [];
		dataEngine.isProcessing = false;
		dataEngine.isInitializing = false;
		endMetric('worker-dataset-selection', 'worker', { action: 'cleared' });
		return;
	}

	// Validate dependencies
	if (!stateProvider) {
		console.error(`[workerState] ❌ DataStateProvider not initialized`);
		endMetric('worker-dataset-selection', 'worker', { error: 'no-provider' });
		return;
	}

	const allDatasets = stateProvider.getDatasets();
	const dataset = allDatasets[id];

	if (!dataset) {
		console.warn(`[workerState] Dataset not found: ${id}`);
		endMetric('worker-dataset-selection', 'worker', { error: 'not-found' });
		return;
	}

	const isDefineXML = id.toLowerCase().endsWith('.xml');

	if (isDefineXML) {
		console.log(`[workerState] Processing DefineXML: ${id}`);
		dataEngine.totalRows = 0;
		dataEngine.visibleRows = [];
		dataEngine.isProcessing = false;
		dataEngine.isInitializing = false;
		endMetric('worker-dataset-selection', 'worker', { action: 'define-xml', id });
		return;
	} else {
		if (!dataset.data || !Array.isArray(dataset.data)) {
			console.warn(`[workerState] Dataset has no tabular data: ${id}`);
			dataEngine.totalRows = 0;
			dataEngine.visibleRows = [];
			endMetric('worker-dataset-selection', 'worker', { error: 'no-data' });
			return;
		}

		const rows = dataset.data.length;
		const columns = Object.keys(dataset.data[0] || {}).length;

		console.log(`[workerState] ⏱️ Tabular dataset ready: ${rows} rows × ${columns} columns`);
		console.log(`[workerState] 🎯 Strategy B enabled - worker transfer deferred until needed`);
		console.log(`[workerState] 📊 Threshold: ${rows < 50000 ? 'Small dataset → Main thread' : 'Large dataset → Worker on first sort'}`);

		// ✅ STRATEGY B: Don't send data to worker immediately!
		// Let ClinicalDataAdapter.loadWindow() decide based on:
		// - Dataset size (< 50k rows = main thread, >= 50k = worker)
		// - Whether sorting is needed (no sort = main thread, sort = worker)
		// - Whether data already in worker (reuse if present)
		//
		// Benefits:
		// - Small datasets switch instantly (no 800ms transfer delay)
		// - Large datasets only transfer when sorting is needed
		// - Saves memory by not duplicating data unnecessarily

		// Set totalRows directly since we're not sending to worker yet
		dataEngine.totalRows = rows;
		dataEngine.visibleRows = []; // Clear stale data from previous dataset
		dataEngine.isInitializing = false;

		endMetric('worker-dataset-selection', 'worker', {
			action: 'tabular-strategy-b',
			rows,
			columns,
			strategyB: true,
			willUseWorker: rows >= 50000 ? 'on-first-sort' : 'never'
		});
	}
}

// ============================================
// WORKER CLEANUP
// ============================================
export function cleanupWorker() {
	if (dataWorker) {
		dataWorker.terminate();
		dataWorker = null;
	}
}

// ============================================
// GETTERS (Public API)
// ============================================
export function getDataEngine() {
	return dataEngine;
}

export function isWorkerInitialized(): boolean {
	return dataWorker !== null;
}

export function getWorkerStatus(): {
	isInitialized: boolean;
	isProcessing: boolean;
	totalRows: number;
	visibleRowsCount: number;
} {
	return {
		isInitialized: dataWorker !== null,
		isProcessing: dataEngine.isProcessing,
		totalRows: dataEngine.totalRows,
		visibleRowsCount: dataEngine.visibleRows.length
	};
}

/**
 * Get WorkerState interface for ClinicalDataAdapter
 * This packages the worker functions into an object that matches the WorkerState interface
 */
export function getWorkerStateInterface() {
	return {
		dataEngine,
		requestSortedRows,
		sendDataToWorkerInChunks
	};
}

// ============================================
// DEBUG HELPERS (for development only)
// ============================================
if (typeof window !== 'undefined') {
	// @ts-ignore - for debugging
	window.__workerState = {
		dataEngine,
		isWorkerInitialized,
		getWorkerStatus,
		requestSortedRows,
		cleanupWorker
	};
}
