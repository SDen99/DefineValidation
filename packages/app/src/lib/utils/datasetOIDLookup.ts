/**
 * Utility for finding Define-XML OID for a given dataset name
 * Used for routing between /datasets/[id] and /metadata/datasets/[oid]
 */

import { normalizeDatasetId } from '@sden99/dataset-domain';
import type { ItemGroup } from '@sden99/cdisc-types/define-xml';
import { extractDefineDataForMetadata } from '$lib/utils/metadata';

/**
 * Find the OID for a dataset by searching through Define-XML ItemGroups
 *
 * @param datasetName - The dataset name (e.g., "ADSL", "adsl.sas7bdat", "DM")
 * @returns The OID if found (e.g., "IG.ADSL"), or null if not found
 *
 * @example
 * const oid = findDatasetOID("ADSL");  // Returns "IG.ADSL"
 * const oid = findDatasetOID("adsl.sas7bdat");  // Returns "IG.ADSL"
 */
export function findDatasetOID(datasetName: string): string | null {
	if (!datasetName) return null;

	const defineBundle = extractDefineDataForMetadata();
	const normalizedSearch = normalizeDatasetId(datasetName);

	// Helper to check if ItemGroup matches the search name
	const matchesDataset = (ig: ItemGroup, search: string): boolean => {
		const sasName = normalizeDatasetId(ig.SASDatasetName || '');
		const displayName = normalizeDatasetId(ig.Name || '');
		return sasName === search || displayName === search;
	};

	// Search ADaM first (most common for clinical data)
	if (defineBundle.adamData?.defineData?.ItemGroups) {
		const dataset = defineBundle.adamData.defineData.ItemGroups.find((ig) =>
			matchesDataset(ig, normalizedSearch)
		);
		if (dataset?.OID) return dataset.OID;
	}

	// Search SDTM second
	if (defineBundle.sdtmData?.defineData?.ItemGroups) {
		const dataset = defineBundle.sdtmData.defineData.ItemGroups.find((ig) =>
			matchesDataset(ig, normalizedSearch)
		);
		if (dataset?.OID) return dataset.OID;
	}

	// Not found in any Define-XML
	return null;
}

/**
 * Find the dataset name (SASDatasetName or Name) from an OID
 * Used for reverse lookup when on metadata page
 *
 * @param oid - The OID (e.g., "IG.ADSL")
 * @returns The dataset name if found (e.g., "ADSL"), or null
 */
export function findDatasetNameFromOID(oid: string): string | null {
	if (!oid) return null;

	const defineBundle = extractDefineDataForMetadata();

	// Search ADaM
	if (defineBundle.adamData?.defineData?.ItemGroups) {
		const dataset = defineBundle.adamData.defineData.ItemGroups.find(
			(ig) => ig.OID === oid
		);
		if (dataset) return dataset.SASDatasetName || dataset.Name || null;
	}

	// Search SDTM
	if (defineBundle.sdtmData?.defineData?.ItemGroups) {
		const dataset = defineBundle.sdtmData.defineData.ItemGroups.find(
			(ig) => ig.OID === oid
		);
		if (dataset) return dataset.SASDatasetName || dataset.Name || null;
	}

	return null;
}

/**
 * Find the OID and define type for a dataset
 *
 * @param datasetName - The dataset name (e.g., "ADSL", "adsl.sas7bdat", "DM")
 * @returns Object with OID and defineType, or null if not found
 *
 * @example
 * const info = findDatasetOIDWithType("ADSL");
 * // Returns { oid: "IG.ADSL", defineType: "adam" }
 */
export function findDatasetOIDWithType(datasetName: string): { oid: string; defineType: 'adam' | 'sdtm' } | null {
	if (!datasetName) return null;

	const defineBundle = extractDefineDataForMetadata();
	const normalizedSearch = normalizeDatasetId(datasetName);

	// Helper to check if ItemGroup matches the search name
	const matchesDataset = (ig: ItemGroup, search: string): boolean => {
		const sasName = normalizeDatasetId(ig.SASDatasetName || '');
		const displayName = normalizeDatasetId(ig.Name || '');
		return sasName === search || displayName === search;
	};

	// Search ADaM first
	if (defineBundle.adamData?.defineData?.ItemGroups) {
		const dataset = defineBundle.adamData.defineData.ItemGroups.find((ig) =>
			matchesDataset(ig, normalizedSearch)
		);
		if (dataset?.OID) {
			return { oid: dataset.OID, defineType: 'adam' };
		}
	}

	// Search SDTM second
	if (defineBundle.sdtmData?.defineData?.ItemGroups) {
		const dataset = defineBundle.sdtmData.defineData.ItemGroups.find((ig) =>
			matchesDataset(ig, normalizedSearch)
		);
		if (dataset?.OID) {
			return { oid: dataset.OID, defineType: 'sdtm' };
		}
	}

	return null;
}
