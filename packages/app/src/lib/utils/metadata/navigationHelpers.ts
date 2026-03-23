/**
 * Shared navigation utilities for metadata browser
 *
 * Provides consistent navigation patterns across detail pages.
 */

import { goto } from '$app/navigation';

/**
 * Extracts the base path from the current URL
 * (everything before /metadata/, or the path up to adam/sdtm if on main page)
 *
 * @param currentPath - The current page URL pathname
 * @returns The base path
 */
export function getBasePath(currentPath: string): string {
	const metadataIndex = currentPath.indexOf('/metadata/');
	if (metadataIndex !== -1) {
		// We're on a detail page - return everything before /metadata/
		return currentPath.substring(0, metadataIndex);
	}

	// We're on the main page - check if path ends with adam or sdtm
	// e.g., /dev/metadata-browser-prototype/adam
	if (currentPath.endsWith('/adam') || currentPath.endsWith('/sdtm')) {
		return currentPath;
	}

	// Try to find adam or sdtm in the path
	const adamIndex = currentPath.indexOf('/adam');
	const sdtmIndex = currentPath.indexOf('/sdtm');

	if (adamIndex !== -1) {
		return currentPath.substring(0, adamIndex + 5); // +5 for '/adam'
	}
	if (sdtmIndex !== -1) {
		return currentPath.substring(0, sdtmIndex + 5); // +5 for '/sdtm'
	}

	// Fallback: return the full path
	return currentPath;
}

/**
 * Navigates to a metadata item detail page
 *
 * @param currentPath - The current page URL pathname
 * @param itemType - The item type (variables, codelists, datasets, etc.)
 * @param oid - The item's OID
 */
export function navigateToMetadataItem(
	currentPath: string,
	itemType: string,
	oid: string
): void {
	const basePath = getBasePath(currentPath);
	goto(`${basePath}/metadata/${itemType}/${oid}`);
}

/**
 * Creates a navigation handler for a specific item type
 *
 * @param currentPath - The current page URL pathname
 * @param itemType - The item type to navigate to
 * @returns A function that takes an OID and navigates to that item
 */
export function createNavigationHandler(
	currentPath: string,
	itemType: string
): (oid: string) => void {
	return (oid: string) => {
		navigateToMetadataItem(currentPath, itemType, oid);
	};
}

/**
 * Creates navigation handlers for common item types
 *
 * @param currentPath - The current page URL pathname
 * @returns Object with navigation handlers for each item type
 */
export function createNavigationHandlers(currentPath: string) {
	return {
		navigateToVariable: createNavigationHandler(currentPath, 'variables'),
		navigateToCodeList: createNavigationHandler(currentPath, 'codelists'),
		navigateToDataset: createNavigationHandler(currentPath, 'datasets'),
		navigateToMethod: createNavigationHandler(currentPath, 'methods'),
		navigateToComment: createNavigationHandler(currentPath, 'comments'),
		navigateToValueList: createNavigationHandler(currentPath, 'valuelists'),
		navigateToWhereClause: createNavigationHandler(currentPath, 'whereclauses')
	};
}
