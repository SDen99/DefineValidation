/**
 * Metadata State Provider Adapter
 * Implements the MetadataStateProvider interface to bridge app state to package
 */

import type { MetadataStateProvider } from '@sden99/metadata-components';
import type { ValueLevelMetadata } from '@sden99/data-processing';
import * as dataState from '$lib/core/state/dataState.svelte';

/**
 * Adapter class that implements MetadataStateProvider interface
 * Bridges app-specific state to the metadata components package
 */
export class MetadataStateProviderAdapter implements MetadataStateProvider {
	getActiveVariables(): ValueLevelMetadata[] {
		return [];
	}

	/**
	 * Get Define XML info from app's data state
	 */
	getDefineXmlInfo() {
		const defineInfo = dataState.getDefineXmlInfo();
		return {
			SDTM: defineInfo.SDTM || null,
			ADaM: defineInfo.ADaM || null,
			sdtmId: defineInfo.sdtmId || undefined,
			adamId: defineInfo.adamId || undefined
		};
	}

	/**
	 * Get active Define info from app's data state
	 */
	getActiveDefineInfo() {
		const activeDefine = dataState.getActiveDefineInfo();
		return activeDefine
			? {
					define: {
						ItemGroups: activeDefine.define?.ItemGroups || []
					}
				}
			: null;
	}

	/**
	 * Get active item group metadata from app's data state
	 */
	getActiveItemGroupMetadata() {
		const activeItemGroup = dataState.getActiveItemGroupMetadata();
		return activeItemGroup
			? {
					Name: activeItemGroup.Name,
					SASDatasetName: activeItemGroup.SASDatasetName,
					Class: activeItemGroup.Class
				}
			: null;
	}
}

/**
 * Singleton instance of the metadata state provider adapter
 */
export const metadataStateProvider = new MetadataStateProviderAdapter();
