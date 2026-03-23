/**
 * Shared utility for delete modal state and handlers
 *
 * Provides consistent delete/reinstate functionality across detail pages.
 */

import { metadataEditState as editState, type DefineType, type ItemType } from '$lib/core/state/metadata/editState.svelte';

/**
 * Checks if an item is already marked as deleted (pure function)
 *
 * Use inside $derived.by() for reactivity
 */
export function isItemDeleted(
	defineType: DefineType,
	itemType: ItemType,
	oid: string | undefined
): boolean {
	if (!oid) return false;
	const change = editState.getChange(defineType, itemType, oid);
	return change?.type === 'DELETED';
}

/**
 * Deletes or reinstates an item (pure function)
 *
 * Call this directly in event handlers with current values
 */
export function handleDeleteOrReinstate<T extends { OID?: string }>(
	item: T | undefined,
	defineType: DefineType,
	itemType: ItemType,
	isAlreadyDeleted: boolean
) {
	if (!item?.OID) return;

	if (isAlreadyDeleted) {
		// Reinstate: remove deletion while preserving any prior edits
		editState.reinstateItem(defineType, itemType, item.OID);
	} else {
		// Delete: record the deletion
		editState.recordDeletion(defineType, itemType, item.OID, item);
	}
}
