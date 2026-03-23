/**
 * VLM State Provider Adapter
 * Implements the VLMStateProvider interface to bridge app state to VLM components package
 * Following the metadata-components reactive boundary pattern
 */

import type { VLMStateProvider, ValueLevelMetadata } from '@sden99/vlm-components';
import type { VLMViewMode } from '@sden99/vlm-processing';
import * as dataState from '$lib/core/state/dataState.svelte.ts';
import { normalizeDatasetId } from '@sden99/dataset-domain';
import { VLMProcessingService } from '@sden99/vlm-processing';
import { globalStateProvider } from '$lib/core/state/GlobalStateProvider.js';

// Create a processing service instance for this adapter
let processingService: VLMProcessingService | null = null;

function getProcessingService(): VLMProcessingService {
	if (!processingService) {
		processingService = new VLMProcessingService(globalStateProvider);
	}
	return processingService;
}

/**
 * Adapter class that implements VLMStateProvider interface
 * Bridges app-specific state to the VLM components package
 * Following STATE_MANAGEMENT_GUIDELINES.md - Interface pattern for cross-package state
 */
export class VLMStateProviderAdapter implements VLMStateProvider {
	/**
	 * Get the selected dataset name (normalized)
	 */
	getSelectedDatasetName(): string | null {
		const selectedId = dataState.selectedDatasetId.value;
		const selectedDomain = dataState.selectedDomain.value;
		return normalizeDatasetId(selectedDomain || selectedId);
	}

	/**
	 * Get VLM variables for the selected dataset
	 */
	getVLMVariables(): ValueLevelMetadata[] {
		const variables = dataState.getVLMVariables();
		return variables || [];
	}

	/**
	 * Get active VLM table data
	 * @param viewMode - 'compact' for PARAMCD-only rows, 'expanded' for full Cartesian expansion
	 */
	getActiveVLMTableData(viewMode: VLMViewMode = 'compact'): any {
		console.log('[VLMStateProviderAdapter] getActiveVLMTableData called with viewMode:', viewMode);
		// Use the processing service directly to pass the view mode
		const result = getProcessingService().getActiveVLMTableData(viewMode);
		console.log('[VLMStateProviderAdapter] Result:', {
			viewMode,
			rowCount: result?.rows?.length,
			compactRowCount: result?.compactRowCount,
			expandedRowCount: result?.expandedRowCount
		});
		return result;
	}

	/**
	 * Check if VLM data is available for the selected dataset
	 */
	hasVLMData(): boolean {
		const vlmData = this.getActiveVLMTableData();
		return (
			vlmData != null && vlmData.rows && Array.isArray(vlmData.rows) && vlmData.rows.length > 0
		);
	}
}

/**
 * Singleton instance of the VLM state provider adapter
 * Following the same pattern as metadataStateProvider
 */
export const vlmStateProvider = new VLMStateProviderAdapter();
