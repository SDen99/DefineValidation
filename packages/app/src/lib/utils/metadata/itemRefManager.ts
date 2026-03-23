/**
 * ItemRef Management Utilities
 *
 * Helper functions for managing ItemRefs (variable references) within datasets.
 * Follows patterns from VLM editor for consistency.
 */

import type { ItemRef, ItemGroup } from '@sden99/cdisc-types/define-xml';
import { metadataEditState, type DefineType } from '$lib/core/state/metadata/editState.svelte';

/**
 * Extended ItemRef with edit tracking metadata
 */
export interface EditableItemRef extends ItemRef {
	_isModified?: boolean;
	_isAdded?: boolean;
	_isDeleted?: boolean;
}

/**
 * Get editable ItemRefs for a dataset with pending changes applied
 *
 * Merges original ItemRefs with pending changes from editState.
 * Similar to getEditableItemRefs from VLM editor.
 *
 * @param dataset - The dataset (ItemGroup)
 * @param defineType - 'adam' or 'sdtm'
 * @param editState - Optional edit state instance (uses singleton if not provided)
 * @returns Array of ItemRefs with pending changes applied
 */
export function getEditableItemRefs(
	dataset: ItemGroup | undefined,
	defineType: DefineType,
	editState: any = metadataEditState
): EditableItemRef[] {
	if (!dataset?.OID) return [];

	// Start with original ItemRefs
	const originalItemRefs = dataset.ItemRefs || [];

	// Check for pending changes
	const change = editState.getChange(defineType, 'datasets', dataset.OID);

	if (!change) {
		// No changes, return original ItemRefs
		return originalItemRefs.map((ref) => ({ ...ref }));
	}

	// Apply changes
	const itemRefs = change.changes.ItemRefs || originalItemRefs;

	// Mark modified items
	return itemRefs.map((ref: ItemRef): EditableItemRef => {
		const original = originalItemRefs.find((orig) => orig.OID === ref.OID);

		return {
			...ref,
			_isModified: original !== undefined && hasItemRefChanged(ref, original),
			_isAdded: original === undefined,
			_isDeleted: false // We handle deletion by removal from array
		};
	});
}

/**
 * Check if an ItemRef has been modified compared to original
 */
function hasItemRefChanged(current: ItemRef, original: ItemRef): boolean {
	return (
		current.Mandatory !== original.Mandatory ||
		current.OrderNumber !== original.OrderNumber ||
		current.KeySequence !== original.KeySequence ||
		current.MethodOID !== original.MethodOID ||
		current.WhereClauseOID !== original.WhereClauseOID ||
		current.Role !== original.Role ||
		current.RoleCodeListOID !== original.RoleCodeListOID
	);
}

/**
 * Add a variable to a dataset by creating a new ItemRef
 *
 * @param dataset - The dataset to add the variable to
 * @param variableOID - The OID of the variable to add
 * @param defineType - 'adam' or 'sdtm'
 * @param options - Optional ItemRef properties
 * @param editState - Optional edit state instance (uses singleton if not provided)
 */
export function addVariableToDataset(
	dataset: ItemGroup,
	variableOID: string,
	defineType: DefineType,
	options: Partial<ItemRef> = {},
	editState: any = metadataEditState
): void {
	if (!dataset?.OID) return;

	// Get current ItemRefs (with any pending changes)
	const currentItemRefs = getEditableItemRefs(dataset, defineType, editState);

	// Check if variable is already in dataset
	if (currentItemRefs.some((ref) => ref.OID === variableOID)) {
		console.warn(`Variable ${variableOID} is already in dataset ${dataset.OID}`);
		return;
	}

	// Calculate next OrderNumber
	const maxOrderNumber = Math.max(
		0,
		...currentItemRefs.map((ref) => parseInt(ref.OrderNumber || '0'))
	);
	const nextOrderNumber = (maxOrderNumber + 1).toString();

	// Create new ItemRef with sensible defaults
	const newItemRef: ItemRef = {
		OID: variableOID,
		Mandatory: options.Mandatory || 'No',
		OrderNumber: options.OrderNumber || nextOrderNumber,
		KeySequence: options.KeySequence || null,
		MethodOID: options.MethodOID || null,
		WhereClauseOID: options.WhereClauseOID || null,
		Role: options.Role || null,
		RoleCodeListOID: options.RoleCodeListOID || null
	};

	// Add new ItemRef to the array
	const updatedItemRefs = [...currentItemRefs, newItemRef];

	// Record change
	editState.recordChange(
		defineType,
		'datasets',
		dataset.OID,
		'ItemRefs',
		updatedItemRefs,
		dataset.ItemRefs || []
	);

}

/**
 * Remove a variable from a dataset
 *
 * @param dataset - The dataset to remove the variable from
 * @param variableOID - The OID of the variable to remove
 * @param defineType - 'adam' or 'sdtm'
 * @param editState - Optional edit state instance (uses singleton if not provided)
 */
export function removeVariableFromDataset(
	dataset: ItemGroup,
	variableOID: string,
	defineType: DefineType,
	editState: any = metadataEditState
): void {
	if (!dataset?.OID) return;

	// Get current ItemRefs
	const currentItemRefs = getEditableItemRefs(dataset, defineType, editState);

	// Filter out the target ItemRef
	const updatedItemRefs = currentItemRefs.filter((ref) => ref.OID !== variableOID);

	// Renumber OrderNumbers to maintain sequence
	const renumberedItemRefs = updatedItemRefs.map((ref, index) => ({
		...ref,
		OrderNumber: (index + 1).toString()
	}));

	// Record change
	editState.recordChange(
		defineType,
		'datasets',
		dataset.OID,
		'ItemRefs',
		renumberedItemRefs,
		dataset.ItemRefs || []
	);

}

/**
 * Update an ItemRef property
 *
 * @param dataset - The dataset containing the ItemRef
 * @param variableOID - The OID of the variable
 * @param defineType - 'adam' or 'sdtm'
 * @param updates - Properties to update
 * @param editState - Optional edit state instance (uses singleton if not provided)
 */
export function updateItemRef(
	dataset: ItemGroup,
	variableOID: string,
	defineType: DefineType,
	updates: Partial<ItemRef>,
	editState: any = metadataEditState
): void {
	if (!dataset?.OID) return;

	// Get current ItemRefs
	const currentItemRefs = getEditableItemRefs(dataset, defineType, editState);

	// Find and update the target ItemRef
	const updatedItemRefs = currentItemRefs.map((ref) => {
		if (ref.OID === variableOID) {
			return { ...ref, ...updates };
		}
		return ref;
	});

	// Record change
	editState.recordChange(
		defineType,
		'datasets',
		dataset.OID,
		'ItemRefs',
		updatedItemRefs,
		dataset.ItemRefs || []
	);

}

/**
 * Reorder variables in a dataset
 *
 * @param dataset - The dataset
 * @param fromIndex - Source index
 * @param toIndex - Destination index
 * @param defineType - 'adam' or 'sdtm'
 * @param editState - Optional edit state instance (uses singleton if not provided)
 */
export function reorderVariableInDataset(
	dataset: ItemGroup,
	fromIndex: number,
	toIndex: number,
	defineType: DefineType,
	editState: any = metadataEditState
): void {
	if (!dataset?.OID) return;

	// Get current ItemRefs
	const currentItemRefs = getEditableItemRefs(dataset, defineType, editState);

	if (fromIndex < 0 || fromIndex >= currentItemRefs.length) return;
	if (toIndex < 0 || toIndex >= currentItemRefs.length) return;
	if (fromIndex === toIndex) return;

	// Reorder
	const reordered = [...currentItemRefs];
	const [movedItem] = reordered.splice(fromIndex, 1);
	reordered.splice(toIndex, 0, movedItem);

	// Renumber OrderNumbers
	const renumberedItemRefs = reordered.map((ref, index) => ({
		...ref,
		OrderNumber: (index + 1).toString()
	}));

	// Record change
	editState.recordChange(
		defineType,
		'datasets',
		dataset.OID,
		'ItemRefs',
		renumberedItemRefs,
		dataset.ItemRefs || []
	);

}

/**
 * Check if a variable is in a dataset
 *
 * @param dataset - The dataset
 * @param variableOID - The variable OID to check
 * @param defineType - 'adam' or 'sdtm'
 * @param editState - Optional edit state instance (uses singleton if not provided)
 * @returns true if variable is in dataset
 */
export function isVariableInDataset(
	dataset: ItemGroup,
	variableOID: string,
	defineType: DefineType,
	editState: any = metadataEditState
): boolean {
	const itemRefs = getEditableItemRefs(dataset, defineType, editState);
	return itemRefs.some((ref) => ref.OID === variableOID);
}

/**
 * Get the next available OrderNumber for a dataset
 *
 * @param dataset - The dataset
 * @param defineType - 'adam' or 'sdtm'
 * @param editState - Optional edit state instance (uses singleton if not provided)
 * @returns Next OrderNumber as a string
 */
export function getNextOrderNumber(
	dataset: ItemGroup,
	defineType: DefineType,
	editState: any = metadataEditState
): string {
	const itemRefs = getEditableItemRefs(dataset, defineType, editState);
	const maxOrderNumber = Math.max(
		0,
		...itemRefs.map((ref) => parseInt(ref.OrderNumber || '0'))
	);
	return (maxOrderNumber + 1).toString();
}
