/**
 * Shared utility for creating editable item state
 *
 * Merges original item data with pending changes from editState,
 * providing a single reactive view of the item's current state.
 */

import { metadataEditState as editState, type DefineType, type ItemType } from '$lib/core/state/metadata/editState.svelte';

/**
 * Merges an item with its pending changes (pure function)
 *
 * Use this inside $derived.by() for reactivity:
 * ```
 * const editableItem = $derived.by(() =>
 *   mergeItemWithChanges(item, defineType, 'variables', item?.OID)
 * );
 * ```
 */
export function mergeItemWithChanges<T extends { OID?: string }>(
	item: T | undefined,
	defineType: DefineType,
	itemType: ItemType,
	oid: string | undefined
): T | null {
	if (!item || !oid) return null;

	// Start with a shallow copy of the original item
	const result = { ...item };

	// Apply any pending changes from editState
	const change = editState.getChange(defineType, itemType, oid);
	if (change) {
		Object.assign(result, change.changes);
	}

	return result;
}

/**
 * Records a field change for an item (pure function)
 *
 * Call this directly in event handlers with current values
 */
export function recordFieldChange<T extends { OID?: string }>(
	item: T | undefined,
	defineType: DefineType,
	itemType: ItemType,
	fieldName: keyof T,
	newValue: any
) {
	if (!item?.OID) return;

	editState.recordChange(
		defineType,
		itemType,
		item.OID,
		fieldName as string,
		newValue,
		item[fieldName]
	);
}

/**
 * Checks if an item has any pending changes
 *
 * @param defineType - The define type
 * @param itemType - The item type
 * @param oid - The item's OID
 * @returns True if the item has pending changes
 */
export function hasItemChanges(
	defineType: DefineType,
	itemType: ItemType,
	oid: string | undefined
): boolean {
	if (!oid) return false;
	return editState.hasChanges(defineType, itemType, oid);
}
