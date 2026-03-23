/**
 * Adapter to convert Define-XML metadata to DefineVariable[] format
 * for use with data-table-v3 chart filters.
 *
 * This adapter provides a clean separation between the complex Define-XML
 * structure and the simple interface expected by chart filter components.
 */

import type { DefineVariable, CodelistItem } from '@sden99/data-table-v3';
import type { ItemGroup, ItemDef, CodeList, ParsedDefineXML } from '@sden99/cdisc-types/define-xml';

/**
 * Convert Define-XML metadata for a dataset into DefineVariable[] format.
 *
 * @param itemGroup - The ItemGroup for the current dataset
 * @param define - The parsed Define-XML containing ItemDefs and CodeLists
 * @returns Array of DefineVariable objects for each variable with available metadata
 */
export function convertToDefineVariables(
	itemGroup: ItemGroup | null | undefined,
	define: ParsedDefineXML | null | undefined
): DefineVariable[] {
	if (!itemGroup || !define) {
		return [];
	}

	const result: DefineVariable[] = [];

	// Create lookup maps for efficient access
	const itemDefsByOID = new Map<string, ItemDef>();
	for (const itemDef of define.ItemDefs || []) {
		if (itemDef.OID) {
			itemDefsByOID.set(itemDef.OID, itemDef);
		}
	}

	const codeListsByOID = new Map<string, CodeList>();
	for (const codeList of define.CodeLists || []) {
		if (codeList.OID) {
			codeListsByOID.set(codeList.OID, codeList);
		}
	}

	// Process each ItemRef in the ItemGroup
	for (const itemRef of itemGroup.ItemRefs || []) {
		if (!itemRef.OID) continue;

		const itemDef = itemDefsByOID.get(itemRef.OID);
		if (!itemDef || !itemDef.Name) continue;

		// Parse length from ItemDef (can be string like "8" or "200")
		const length = itemDef.Length ? parseInt(itemDef.Length, 10) : undefined;

		// Build the DefineVariable
		const defineVar: DefineVariable = {
			variable: {
				name: itemDef.Name,
				dataType: itemDef.DataType || 'text',
				length: !isNaN(length as number) ? length : undefined
			},
			// Mandatory is "Yes" or "No" in Define-XML
			mandatory: itemRef.Mandatory?.toLowerCase() === 'yes'
		};

		// Add codelist if available
		if (itemDef.CodeListOID) {
			const codeList = codeListsByOID.get(itemDef.CodeListOID);
			if (codeList) {
				const items = convertCodeListItems(codeList);
				if (items.length > 0) {
					defineVar.codeList = { items };
				}
			}
		}

		result.push(defineVar);
	}

	return result;
}

/**
 * Convert CodeList items to the simple CodelistItem format.
 * Handles both CodeListItems and EnumeratedItems.
 */
function convertCodeListItems(codeList: CodeList): CodelistItem[] {
	const items: CodelistItem[] = [];

	// Process CodeListItems (have decode values)
	for (const item of codeList.CodeListItems || []) {
		if (item.CodedValue !== null && item.CodedValue !== undefined) {
			items.push({
				codedValue: item.CodedValue,
				decode: item.Decode?.TranslatedText || item.CodedValue
			});
		}
	}

	// Process EnumeratedItems (may not have decode values)
	for (const item of codeList.EnumeratedItems || []) {
		if (item.CodedValue !== null && item.CodedValue !== undefined) {
			// EnumeratedItems typically don't have Decode, use CodedValue as decode
			items.push({
				codedValue: item.CodedValue,
				decode: item.CodedValue
			});
		}
	}

	return items;
}
