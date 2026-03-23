/**
 * OID Generation and Validation Utilities
 *
 * Utilities for generating and validating OIDs following CDISC Define-XML conventions.
 *
 * OID Patterns:
 * - Variables (ItemDef): IT.{DATASET}.{VARNAME}
 * - Datasets (ItemGroupDef): IG.{DATASET}
 * - Methods: MT.{description}
 * - CodeLists: CL.{name}
 * - ValueLists: VL.{dataset}.{varname}
 * - WhereClauses: WC.{condition}
 */

import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';

/**
 * Generate a variable OID following the pattern IT.{DATASET}.{VARNAME}
 *
 * @param datasetName - The dataset name (e.g., "ADSL")
 * @param variableName - The variable name (e.g., "STUDYID")
 * @returns Generated OID (e.g., "IT.ADSL.STUDYID")
 */
export function generateVariableOID(datasetName: string, variableName: string): string {
	const cleanDataset = sanitizeForOID(datasetName);
	const cleanVariable = sanitizeForOID(variableName);
	return `IT.${cleanDataset}.${cleanVariable}`;
}

/**
 * Generate a dataset OID following the pattern IG.{DATASET}
 *
 * @param datasetName - The dataset name (e.g., "ADSL")
 * @returns Generated OID (e.g., "IG.ADSL")
 */
export function generateDatasetOID(datasetName: string): string {
	const cleanDataset = sanitizeForOID(datasetName);
	return `IG.${cleanDataset}`;
}

/**
 * Generate a codelist OID following the pattern CL.{NAME}
 *
 * @param codelistName - The codelist name
 * @returns Generated OID (e.g., "CL.COUNTRY")
 */
export function generateCodeListOID(codelistName: string): string {
	const cleanName = sanitizeForOID(codelistName);
	return `CL.${cleanName}`;
}

/**
 * Generate a method OID following the pattern MT.{DESCRIPTION}
 *
 * @param description - The method description
 * @returns Generated OID (e.g., "MT.BASELINE_CALC")
 */
export function generateMethodOID(description: string): string {
	const cleanDesc = sanitizeForOID(description);
	return `MT.${cleanDesc}`;
}

/**
 * Generate a comment OID following the pattern COM.{TYPE}.{NAME}
 *
 * @param type - The comment type (e.g., "CO", "DC")
 * @param name - The comment identifier
 * @returns Generated OID (e.g., "COM.CO.ADSL_ACOUNTRY")
 */
export function generateCommentOID(type: string, name: string): string {
	const cleanType = sanitizeForOID(type);
	const cleanName = sanitizeForOID(name);
	return `COM.${cleanType}.${cleanName}`;
}

/**
 * Sanitize a string for use in an OID
 * Removes special characters, preserves underscores, converts to uppercase
 *
 * @param str - String to sanitize
 * @returns Sanitized string suitable for OID
 */
function sanitizeForOID(str: string): string {
	return str
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9_]/g, '_') // Replace non-alphanumeric (except underscore) with underscore
		.replace(/_+/g, '_') // Collapse multiple underscores
		.replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Check if an OID is unique within a specific item type
 *
 * @param oid - The OID to check
 * @param itemType - The type of item ('ItemDefs', 'ItemGroups', 'CodeLists', etc.)
 * @param defineData - The Define-XML data to check against
 * @returns true if OID is unique, false if it already exists
 */
export function isOIDUnique(
	oid: string,
	itemType: keyof ParsedDefineXML,
	defineData: ParsedDefineXML | null
): boolean {
	if (!defineData || !oid) return false;

	const items = defineData[itemType] as Array<{ OID?: string | null }> | undefined;
	if (!items) return true;

	return !items.some((item) => item.OID === oid);
}

/**
 * Check if an OID is unique across all Define-XML sources (ADaM and SDTM)
 *
 * @param oid - The OID to check
 * @param itemType - The type of item
 * @param adamData - ADaM Define-XML data (optional)
 * @param sdtmData - SDTM Define-XML data (optional)
 * @returns true if OID is unique across all sources
 */
export function isOIDUniqueGlobally(
	oid: string,
	itemType: keyof ParsedDefineXML,
	adamData: ParsedDefineXML | null,
	sdtmData: ParsedDefineXML | null
): boolean {
	const uniqueInAdam = !adamData || isOIDUnique(oid, itemType, adamData);
	const uniqueInSdtm = !sdtmData || isOIDUnique(oid, itemType, sdtmData);

	return uniqueInAdam && uniqueInSdtm;
}

/**
 * Generate a unique variable OID by adding a numeric suffix if needed
 *
 * @param datasetName - The dataset name
 * @param variableName - The variable name
 * @param defineData - The Define-XML data to check against
 * @param maxAttempts - Maximum number of attempts to find unique OID (default: 100)
 * @returns Unique OID, or null if no unique OID could be generated
 */
export function generateUniqueVariableOID(
	datasetName: string,
	variableName: string,
	defineData: ParsedDefineXML | null,
	maxAttempts: number = 100
): string | null {
	// Try base OID first
	const baseOID = generateVariableOID(datasetName, variableName);
	if (isOIDUnique(baseOID, 'ItemDefs', defineData)) {
		return baseOID;
	}

	// Try with numeric suffixes
	for (let i = 1; i <= maxAttempts; i++) {
		const oid = `${baseOID}_${i}`;
		if (isOIDUnique(oid, 'ItemDefs', defineData)) {
			return oid;
		}
	}

	return null; // Could not generate unique OID
}

/**
 * Validate an OID format
 *
 * OIDs should:
 * - Not be empty
 * - Contain only alphanumeric characters, underscores, dots, and hyphens
 * - Start with a letter or prefix (IT., IG., CL., etc.)
 *
 * @param oid - The OID to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateOIDFormat(oid: string): { isValid: boolean; error?: string } {
	if (!oid || oid.trim().length === 0) {
		return { isValid: false, error: 'OID cannot be empty' };
	}

	// Check for valid characters (alphanumeric, underscore, dot, hyphen)
	if (!/^[A-Z0-9._-]+$/i.test(oid)) {
		return {
			isValid: false,
			error: 'OID can only contain letters, numbers, underscores, dots, and hyphens'
		};
	}

	// Check length (ODM spec suggests reasonable limits)
	if (oid.length > 128) {
		return { isValid: false, error: 'OID is too long (max 128 characters)' };
	}

	return { isValid: true };
}

/**
 * Extract dataset name from a variable OID (IT.{DATASET}.{VARNAME} pattern)
 *
 * @param oid - The variable OID
 * @returns Dataset name, or null if pattern doesn't match
 */
export function extractDatasetFromVariableOID(oid: string): string | null {
	const match = oid.match(/^IT\.([^.]+)\./);
	return match ? match[1] : null;
}

/**
 * Extract variable name from a variable OID (IT.{DATASET}.{VARNAME} pattern)
 *
 * @param oid - The variable OID
 * @returns Variable name, or null if pattern doesn't match
 */
export function extractVariableNameFromOID(oid: string): string | null {
	const match = oid.match(/^IT\.[^.]+\.(.+)$/);
	return match ? match[1] : null;
}
