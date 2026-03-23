/**
 * Prototype VLM State Provider
 * Adapts the VLM state provider interface for use in the metadata browser prototype
 * Similar pattern to Phase 1 dataset details implementation
 */

import type { VLMStateProvider } from '@sden99/vlm-components';
import type { ValueLevelMetadata } from '@sden99/vlm-processing';
import { getActiveVLMTableData, getVLMVariables } from '@sden99/vlm-processing';
import type { VLMTableData } from '@sden99/vlm-processing/types';

/**
 * Prototype-specific VLM state provider
 * Delegates to the global VLM processing service
 */
export class PrototypeVLMStateProvider implements VLMStateProvider {
	constructor(private datasetName: string) {}

	/**
	 * Get the selected dataset name
	 */
	getSelectedDatasetName(): string | null {
		return this.datasetName;
	}

	/**
	 * Get VLM variables for the selected dataset
	 * Delegates to the global VLM processing service
	 */
	getVLMVariables(): ValueLevelMetadata[] {
		try {
			return getVLMVariables() || [];
		} catch (error) {
			console.error('[PrototypeVLMStateProvider] Error getting VLM variables:', error);
			return [];
		}
	}

	/**
	 * Get active VLM table data
	 * Delegates to the global VLM processing service
	 */
	getActiveVLMTableData(): VLMTableData | null {
		try {
			return getActiveVLMTableData();
		} catch (error) {
			console.error('[PrototypeVLMStateProvider] Error getting VLM table data:', error);
			return null;
		}
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
