/**
 * Adapter to merge dataset columns with Define-XML metadata into a unified variable list.
 *
 * Follows the same OID-lookup pattern as defineVariablesAdapter.ts.
 */

import type { ItemGroup, ItemDef, CodeList, ParsedDefineXML } from '@sden99/cdisc-types/define-xml';
import type { MergedVariable } from '$lib/types/mergedVariable';

/**
 * Merge dataset columns with Define-XML metadata into a sorted MergedVariable list.
 *
 * Algorithm:
 * 1. Build OID lookup maps for ItemDefs and CodeLists
 * 2. Walk ItemGroup.ItemRefs → create define-side entries keyed by uppercase name
 * 3. Walk dataColumns → match against define map or create data-only entries (preserves table column order)
 * 4. Append unmatched define-only variables at the end
 */
export function mergeVariables(
	dataColumns: string[],
	visibleColumns: string[],
	dtypes: Record<string, string> | null | undefined,
	itemGroup: ItemGroup | null | undefined,
	define: ParsedDefineXML | null | undefined
): MergedVariable[] {
	const visibleSet = new Set(visibleColumns);

	// If no Define-XML, return data-only variables
	if (!itemGroup || !define) {
		return dataColumns.map((col) => ({
			name: col,
			source: 'data-only' as const,
			pandasDtype: dtypes?.[col] ?? null,
			visible: visibleSet.has(col),
			label: null,
			cdiscDataType: null,
			length: null,
			mandatory: null,
			role: null,
			orderNumber: null,
			originType: null,
			codeList: null,
			isKey: false
		}));
	}

	// Build OID lookup maps
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

	// Step 2: Build define-side entries from ItemRefs
	const defineMap = new Map<string, MergedVariable>();

	for (const itemRef of itemGroup.ItemRefs || []) {
		if (!itemRef.OID) continue;

		const itemDef = itemDefsByOID.get(itemRef.OID);
		if (!itemDef?.Name) continue;

		const orderNum = itemRef.OrderNumber ? parseInt(itemRef.OrderNumber, 10) : null;
		const resolvedCodeList = itemDef.CodeListOID
			? codeListsByOID.get(itemDef.CodeListOID) ?? null
			: null;

		const merged: MergedVariable = {
			name: itemDef.Name,
			source: 'define-only',
			pandasDtype: null,
			visible: false,
			label: itemDef.Description ?? null,
			cdiscDataType: itemDef.DataType ?? null,
			length: itemDef.Length ?? null,
			mandatory: itemRef.Mandatory ?? null,
			role: itemRef.Role ?? null,
			orderNumber: orderNum !== null && !isNaN(orderNum) ? orderNum : null,
			originType: itemDef.OriginType ?? null,
			codeList: resolvedCodeList,
			isKey: itemRef.KeySequence != null && itemRef.KeySequence !== ''
		};

		defineMap.set(itemDef.Name.toUpperCase(), merged);
	}

	// Step 3: Walk data columns and match
	const result: MergedVariable[] = [];
	const matchedDefineKeys = new Set<string>();

	for (const col of dataColumns) {
		const key = col.toUpperCase();
		const defineEntry = defineMap.get(key);

		if (defineEntry) {
			// Matched — merge data info into define entry
			matchedDefineKeys.add(key);
			result.push({
				...defineEntry,
				name: col, // Use data column name as canonical
				source: 'both',
				pandasDtype: dtypes?.[col] ?? null,
				visible: visibleSet.has(col)
			});
		} else {
			// Data-only variable
			result.push({
				name: col,
				source: 'data-only',
				pandasDtype: dtypes?.[col] ?? null,
				visible: visibleSet.has(col),
				label: null,
				cdiscDataType: null,
				length: null,
				mandatory: null,
				role: null,
				orderNumber: null,
				originType: null,
				codeList: null,
				isKey: false
			});
		}
	}

	// Step 4: Add unmatched define-only variables
	for (const [key, entry] of defineMap) {
		if (!matchedDefineKeys.has(key)) {
			result.push(entry);
		}
	}

	// Return in dataColumns order (matches table column order), with define-only appended at end
	return result;
}
