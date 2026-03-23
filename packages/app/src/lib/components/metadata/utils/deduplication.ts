/**
 * Deduplication Utilities for Define-XML Metadata
 *
 * This module provides pure functions for deduplicating ItemDefs (variables)
 * based on their basic information signature. Variables with identical
 * properties but different OIDs are grouped together.
 *
 * Extracted from MetadataTree.svelte for better testability and maintainability.
 */

export interface DeduplicatedGroup {
	signature: string;
	canonicalOID: string;
	canonicalItem: any;
	variantOIDs: string[];
	datasetCount: number;
}

/**
 * Generate deduplication signature for ItemDef (variables)
 *
 * Two ItemDefs are considered duplicates if they have matching basic information.
 * This signature captures the essential properties that define variable identity.
 *
 * @param itemDef - The ItemDef to generate a signature for
 * @returns A string signature combining key properties
 */
export function getItemDefSignature(itemDef: any): string {
	const normalize = (val: any) => {
		if (val === null || val === undefined || val === '') return 'NULL';
		return String(val);
	};

	return [
		normalize(itemDef.Name),
		normalize(itemDef.DataType),
		normalize(itemDef.Length),
		normalize(itemDef.Label),
		normalize(itemDef.CommentOID),
		normalize(itemDef.CodeListOID),
		normalize(itemDef.Origin?.Type),
		normalize(itemDef.Origin?.Source)
	].join('|');
}

/**
 * Deduplicate ItemDefs - group by signature and pick canonical OID
 *
 * Variables with identical signatures are grouped together. The canonical OID
 * is chosen as the first alphabetically (for consistency).
 *
 * @param itemDefs - Array of ItemDefs to deduplicate
 * @returns Array of deduplicated groups with canonical representation
 */
export function deduplicateItemDefs(itemDefs: any[]): DeduplicatedGroup[] {
	const groups = new Map<string, any[]>();

	// Group by signature
	itemDefs.forEach(item => {
		const sig = getItemDefSignature(item);
		if (!groups.has(sig)) {
			groups.set(sig, []);
		}
		groups.get(sig)!.push(item);
	});

	// For each group, pick canonical OID (first alphabetically)
	const deduplicated = Array.from(groups.entries()).map(([signature, variants]) => {
		const sortedVariants = variants.sort((a, b) =>
			(a.OID || '').localeCompare(b.OID || '')
		);
		const canonical = sortedVariants[0];

		return {
			signature,
			canonicalOID: canonical.OID,
			canonicalItem: canonical,
			variantOIDs: sortedVariants.map(v => v.OID).filter(Boolean),
			datasetCount: 0 // Will be computed separately
		};
	});

	return deduplicated;
}

/**
 * Count how many datasets use any variant of a deduplicated variable
 *
 * This function checks all ItemRefs across all datasets to find which datasets
 * reference any of the variant OIDs.
 *
 * @param variantOIDs - Array of OID variants for a deduplicated variable
 * @param datasets - Array of ItemGroups (datasets) to check
 * @returns Number of unique datasets that use any variant
 */
export function countDatasetsUsingVariable(
	variantOIDs: string[],
	datasets: any[]
): number {
	const datasetOIDs = new Set<string>();

	datasets.forEach(dataset => {
		if (dataset.ItemRefs) {
			const hasVariant = dataset.ItemRefs.some(
				(ref: any) => variantOIDs.includes(ref.OID)
			);
			if (hasVariant && dataset.OID) {
				datasetOIDs.add(dataset.OID);
			}
		}
	});

	return datasetOIDs.size;
}
