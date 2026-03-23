/**
 * Filtering Utilities for MetadataTree
 *
 * This module provides pure functions for filtering metadata items based on:
 * - Graph-based filtering (connected nodes)
 * - Text search filtering (matching OIDs/labels)
 * - Selection state
 * - Item lookups
 *
 * Extracted from MetadataTree.svelte for better testability and maintainability.
 */

import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';

/**
 * Check if an item should be visible based on active filters
 *
 * An item is visible if:
 * - It passes the graph filter (if active)
 * - It passes the text search filter (if active)
 * - No filters are active (all items visible)
 *
 * @param oid - The OID of the item to check
 * @param filterActive - Whether graph-based filtering is active
 * @param connectedNodes - Set of OIDs connected to the selected node (for graph filter)
 * @param matchingOids - Set of OIDs matching the text search (null if no search)
 * @returns True if the item should be visible
 */
export function isVisible(
	oid: string | null,
	filterActive: boolean,
	connectedNodes: Set<string>,
	matchingOids: Set<string> | null
): boolean {
	if (!oid) return true;

	// Graph-based filter
	if (filterActive && !connectedNodes.has(oid)) {
		return false;
	}

	// Text search filter
	if (matchingOids && !matchingOids.has(oid)) {
		return false;
	}

	return true;
}

/**
 * Check if any variant OID in a deduplicated group is visible
 *
 * Used for deduplicated variables where multiple OIDs represent the same variable.
 * The group is visible if ANY of its variant OIDs passes the filters.
 *
 * @param variantOIDs - Array of OID variants for a deduplicated variable
 * @param filterActive - Whether graph-based filtering is active
 * @param connectedNodes - Set of OIDs connected to the selected node
 * @param matchingOids - Set of OIDs matching the text search
 * @returns True if any variant is visible
 */
export function isAnyVariantVisible(
	variantOIDs: string[],
	filterActive: boolean,
	connectedNodes: Set<string>,
	matchingOids: Set<string> | null
): boolean {
	// If no filters active, all are visible
	if (!filterActive && !matchingOids) return true;

	// Check if any variant passes the filters
	return variantOIDs.some((oid) => isVisible(oid, filterActive, connectedNodes, matchingOids));
}

/**
 * Check if a specific metadata item is currently selected
 *
 * Parses the current URL path to determine if the given item type and OID
 * match the currently displayed detail page.
 *
 * @param type - The metadata type (e.g., 'datasets', 'variables', 'codelists')
 * @param oid - The OID of the item
 * @param currentPath - The current URL path
 * @returns True if this item is currently selected
 */
export function isItemSelected(type: string, oid: string, currentPath: string): boolean {
	// Extract the metadata path from currentPath
	// Format: /dev/metadata-browser-prototype/{adam|sdtm}/metadata/{type}/{oid}
	const metadataMatch = currentPath.match(/\/metadata\/([^/]+)\/([^/]+)/);
	if (!metadataMatch) return false;

	const [, pathType, pathOid] = metadataMatch;
	// URL-decode the pathOid to handle spaces and special characters
	const decodedPathOid = decodeURIComponent(pathOid);
	return pathType === type && decodedPathOid === oid;
}

/**
 * Get the Name of an ItemDef from its OID
 *
 * Searches both ADaM and SDTM data to find the ItemDef with the given OID
 * and returns its Name property.
 *
 * @param oid - The OID to look up
 * @param adamData - ADaM Define-XML data (if loaded)
 * @param sdtmData - SDTM Define-XML data (if loaded)
 * @returns The Name of the ItemDef, or the OID if not found, or 'Unknown' if OID is null
 */
export function getItemDefName(
	oid: string | null,
	adamData: { defineData: ParsedDefineXML } | null,
	sdtmData: { defineData: ParsedDefineXML } | null
): string {
	if (!oid) return 'Unknown';

	// Check ADaM first
	if (adamData) {
		const itemDef = adamData.defineData.ItemDefs?.find((item) => item.OID === oid);
		if (itemDef) return itemDef.Name || oid;
	}

	// Then check SDTM
	if (sdtmData) {
		const itemDef = sdtmData.defineData.ItemDefs?.find((item) => item.OID === oid);
		if (itemDef) return itemDef.Name || oid;
	}

	return oid;
}
