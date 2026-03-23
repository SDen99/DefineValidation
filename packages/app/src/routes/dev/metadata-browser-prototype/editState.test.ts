/**
 * Unit Tests for Edit State Module
 *
 * Tests all editing functionality including:
 * - Recording changes (modifications, additions, deletions)
 * - Undo/redo functionality
 * - Reinstate logic (preserving edits)
 * - Change tracking and retrieval
 *
 * Run with: pnpm --filter app test editState
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditState, type DefineType, type ItemType } from './editState.svelte.ts';

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		// Expose store for testing
		_getStore: () => store
	};
})();

// Setup global mocks - must be defined to pass browser checks
if (typeof window === 'undefined') {
	(global as any).window = { localStorage: localStorageMock };
}

describe('EditState - Basic Operations', () => {
	let editState: EditState;

	beforeEach(() => {
		editState = new EditState();
		localStorageMock.clear();
	});

	it('should start in non-edit mode', () => {
		expect(editState.editMode).toBe(false);
	});

	it('should toggle edit mode', () => {
		editState.toggleEditMode();
		expect(editState.editMode).toBe(true);
		editState.toggleEditMode();
		expect(editState.editMode).toBe(false);
	});

	it('should enable and disable edit mode', () => {
		editState.enableEditMode();
		expect(editState.editMode).toBe(true);
		editState.disableEditMode();
		expect(editState.editMode).toBe(false);
	});

	it('should start with no changes', () => {
		expect(editState.getTotalChanges()).toBe(0);
	});
});

describe('EditState - Recording Changes', () => {
	let editState: EditState;
	const defineType: DefineType = 'adam';
	const itemType: ItemType = 'codelists';
	const oid = 'CL.TEST';

	beforeEach(() => {
		editState = new EditState();
		localStorageMock.clear();
	});

	it('should record a modification', () => {
		editState.recordChange(defineType, itemType, oid, 'Name', 'New Name', 'Old Name');

		expect(editState.hasChanges(defineType, itemType, oid)).toBe(true);
		expect(editState.getTotalChanges()).toBe(1);

		const change = editState.getChange(defineType, itemType, oid);
		expect(change?.type).toBe('MODIFIED');
		expect(change?.changes.Name).toBe('New Name');
		expect(change?.originalValues?.Name).toBe('Old Name');
	});

	it('should record multiple field changes on same item', () => {
		editState.recordChange(defineType, itemType, oid, 'Name', 'New Name', 'Old Name');
		editState.recordChange(defineType, itemType, oid, 'Description', 'New Desc', 'Old Desc');

		const change = editState.getChange(defineType, itemType, oid);
		expect(change?.changes.Name).toBe('New Name');
		expect(change?.changes.Description).toBe('New Desc');
		expect(editState.getTotalChanges()).toBe(1); // Still one item
	});

	it('should preserve original values for undo', () => {
		editState.recordChange(defineType, itemType, oid, 'Name', 'Name1', 'Original');
		editState.recordChange(defineType, itemType, oid, 'Name', 'Name2', 'Name1');
		editState.recordChange(defineType, itemType, oid, 'Name', 'Name3', 'Name2');

		const change = editState.getChange(defineType, itemType, oid);
		expect(change?.changes.Name).toBe('Name3');
		expect(change?.originalValues?.Name).toBe('Original'); // Preserves first original
	});

	it('should record an addition', () => {
		const newItem = { Name: 'New Item', OID: oid };
		editState.recordAddition(defineType, itemType, oid, newItem);

		const change = editState.getChange(defineType, itemType, oid);
		expect(change?.type).toBe('ADDED');
		expect(change?.changes.Name).toBe('New Item');
	});

	it('should record a deletion', () => {
		const itemData = { Name: 'To Delete', OID: oid };
		editState.recordDeletion(defineType, itemType, oid, itemData);

		const change = editState.getChange(defineType, itemType, oid);
		expect(change?.type).toBe('DELETED');
		expect(change?.originalValues?.Name).toBe('To Delete');
	});
});

describe('EditState - Undo/Redo', () => {
	let editState: EditState;
	const defineType: DefineType = 'adam';
	const itemType: ItemType = 'variables';
	const oid = 'VAR.TEST';

	beforeEach(() => {
		editState = new EditState();
		localStorageMock.clear();
	});

	it('should undo a change', () => {
		editState.recordChange(defineType, itemType, oid, 'Name', 'New', 'Original');
		expect(editState.hasChanges(defineType, itemType, oid)).toBe(true);

		editState.undo();
		expect(editState.hasChanges(defineType, itemType, oid)).toBe(false);
	});

	it('should redo an undone change', () => {
		editState.recordChange(defineType, itemType, oid, 'Name', 'New', 'Original');
		editState.undo();

		editState.redo();
		expect(editState.hasChanges(defineType, itemType, oid)).toBe(true);
		const change = editState.getChange(defineType, itemType, oid);
		expect(change?.changes.Name).toBe('New');
	});

	it('should clear redo stack on new change', () => {
		editState.recordChange(defineType, itemType, oid, 'Name', 'Change1', 'Original');
		editState.undo();
		expect(editState.redoStack.length).toBe(1);

		editState.recordChange(defineType, itemType, oid, 'Name', 'Change2', 'Original');
		expect(editState.redoStack.length).toBe(0);
	});

	it('should track undo stack size', () => {
		editState.recordChange(defineType, itemType, oid, 'Name', 'Change1', 'Original');
		editState.recordChange(defineType, itemType, oid, 'Name', 'Change2', 'Change1');
		expect(editState.undoStack.length).toBe(2);

		editState.undo();
		expect(editState.undoStack.length).toBe(1);
	});
});

describe('EditState - Reinstate Logic (FIX: Preserve edits when reinstating)', () => {
	let editState: EditState;
	const defineType: DefineType = 'adam';
	const itemType: ItemType = 'codelists';
	const oid = 'CL.TEST';

	beforeEach(() => {
		editState = new EditState();
		localStorageMock.clear();
	});

	it('should preserve edits when reinstating a deleted item', () => {
		// User edits the name
		editState.recordChange(defineType, itemType, oid, 'Name', 'Edited Name', 'Original Name');
		expect(editState.getChange(defineType, itemType, oid)?.type).toBe('MODIFIED');

		// User deletes the item
		const itemData = { Name: 'Edited Name', OID: oid };
		editState.recordDeletion(defineType, itemType, oid, itemData);
		expect(editState.getChange(defineType, itemType, oid)?.type).toBe('DELETED');

		// User reinstates the item
		editState.reinstateItem(defineType, itemType, oid);

		// Should restore to MODIFIED state with the edit preserved
		const change = editState.getChange(defineType, itemType, oid);
		expect(change?.type).toBe('MODIFIED');
		expect(change?.changes.Name).toBe('Edited Name');
		expect(change?.originalValues?.Name).toBe('Original Name');
	});

	it('should remove deletion entirely if no prior edits', () => {
		// Delete without prior edits
		const itemData = { Name: 'Original', OID: oid };
		editState.recordDeletion(defineType, itemType, oid, itemData);
		expect(editState.hasChanges(defineType, itemType, oid)).toBe(true);

		// Reinstate
		editState.reinstateItem(defineType, itemType, oid);

		// Should have no changes tracked
		expect(editState.hasChanges(defineType, itemType, oid)).toBe(false);
	});

	it('should handle multiple edits before deletion', () => {
		editState.recordChange(defineType, itemType, oid, 'Name', 'Edit1', 'Original');
		editState.recordChange(defineType, itemType, oid, 'Description', 'Edit2', 'OldDesc');

		editState.recordDeletion(defineType, itemType, oid, {});
		editState.reinstateItem(defineType, itemType, oid);

		const change = editState.getChange(defineType, itemType, oid);
		expect(change?.type).toBe('MODIFIED');
		expect(change?.changes.Name).toBe('Edit1');
		expect(change?.changes.Description).toBe('Edit2');
	});
});

describe('EditState - Change Tracking', () => {
	let editState: EditState;

	beforeEach(() => {
		editState = new EditState();
		localStorageMock.clear();
	});

	it('should count changes across different types', () => {
		editState.recordChange('adam', 'codelists', 'CL1', 'Name', 'New', 'Old');
		editState.recordChange('adam', 'variables', 'VAR1', 'Name', 'New', 'Old');
		editState.recordChange('sdtm', 'datasets', 'DS1', 'Name', 'New', 'Old');

		expect(editState.getTotalChanges()).toBe(3);
	});

	it('should get modified OIDs for a specific item type', () => {
		editState.recordChange('adam', 'codelists', 'CL1', 'Name', 'New', 'Old');
		editState.recordChange('adam', 'codelists', 'CL2', 'Name', 'New', 'Old');
		editState.recordChange('adam', 'variables', 'VAR1', 'Name', 'New', 'Old');

		const modifiedCodelists = editState.getModifiedOIDs('adam', 'codelists');
		expect(modifiedCodelists).toHaveLength(2);
		expect(modifiedCodelists).toContain('CL1');
		expect(modifiedCodelists).toContain('CL2');
	});

	it('should return empty array for no changes', () => {
		const modified = editState.getModifiedOIDs('adam', 'codelists');
		expect(modified).toEqual([]);
	});
});

describe('EditState - Persistence', () => {
	let editState: EditState;

	beforeEach(() => {
		editState = new EditState();
		localStorageMock.clear();
	});

	it('should persist changes to localStorage', () => {
		editState.recordChange('adam', 'codelists', 'CL1', 'Name', 'New', 'Old');

		const stored = localStorageMock.getItem('metadata-browser-changes');
		expect(stored).toBeTruthy();

		const parsed = JSON.parse(stored!);
		expect(parsed.adam.codelists.CL1.changes.Name).toBe('New');
	});

	it('should load changes from localStorage', () => {
		const changes = {
			adam: {
				codelists: {
					CL1: {
						type: 'MODIFIED',
						changes: { Name: 'Loaded' },
						originalValues: { Name: 'Original' },
						timestamp: new Date().toISOString()
					}
				}
			}
		};

		localStorageMock.setItem('metadata-browser-changes', JSON.stringify(changes));

		const newEditState = new EditState();
		newEditState.load();

		expect(newEditState.hasChanges('adam', 'codelists', 'CL1')).toBe(true);
		expect(newEditState.getChange('adam', 'codelists', 'CL1')?.changes.Name).toBe('Loaded');
	});

	it('should clear localStorage when clearing changes', () => {
		editState.recordChange('adam', 'codelists', 'CL1', 'Name', 'New', 'Old');
		expect(localStorageMock.getItem('metadata-browser-changes')).toBeTruthy();

		editState.clearChanges();
		expect(localStorageMock.getItem('metadata-browser-changes')).toBeNull();
	});
});

describe('EditState - Export/Import', () => {
	let editState: EditState;

	beforeEach(() => {
		editState = new EditState();
		localStorageMock.clear();
	});

	it('should export changes as JSON', () => {
		editState.recordChange('adam', 'codelists', 'CL1', 'Name', 'New', 'Old');

		const exported = editState.exportChanges();
		const parsed = JSON.parse(exported);

		expect(parsed.adam.codelists.CL1.changes.Name).toBe('New');
	});

	it('should import changes from JSON', () => {
		const changes = {
			adam: {
				variables: {
					VAR1: {
						type: 'MODIFIED',
						changes: { Name: 'Imported' },
						originalValues: { Name: 'Original' },
						timestamp: new Date().toISOString()
					}
				}
			}
		};

		editState.importChanges(JSON.stringify(changes));

		expect(editState.hasChanges('adam', 'variables', 'VAR1')).toBe(true);
		expect(editState.getChange('adam', 'variables', 'VAR1')?.changes.Name).toBe('Imported');
	});

	it('should throw error on invalid JSON import', () => {
		expect(() => {
			editState.importChanges('invalid json');
		}).toThrow();
	});
});

describe('EditState - Discard Changes', () => {
	let editState: EditState;

	beforeEach(() => {
		editState = new EditState();
		localStorageMock.clear();
	});

	it('should discard changes for a specific item', () => {
		editState.recordChange('adam', 'codelists', 'CL1', 'Name', 'New', 'Old');
		editState.recordChange('adam', 'codelists', 'CL2', 'Name', 'New', 'Old');

		editState.discardItemChanges('adam', 'codelists', 'CL1');

		expect(editState.hasChanges('adam', 'codelists', 'CL1')).toBe(false);
		expect(editState.hasChanges('adam', 'codelists', 'CL2')).toBe(true);
		expect(editState.getTotalChanges()).toBe(1);
	});

	it('should clean up empty nested objects', () => {
		editState.recordChange('adam', 'codelists', 'CL1', 'Name', 'New', 'Old');
		editState.discardItemChanges('adam', 'codelists', 'CL1');

		// Should not have empty nested objects
		expect(editState.changes.adam).toBeUndefined();
	});
});
