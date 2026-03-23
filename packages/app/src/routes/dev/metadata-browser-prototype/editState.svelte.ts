/**
 * Edit State Module for Metadata Browser Prototype
 *
 * Manages editing state, change tracking, and undo/redo functionality.
 */

// Define types (ADAM/SDTM)
export type DefineType = 'adam' | 'sdtm';

// Change types
export type ChangeType = 'MODIFIED' | 'ADDED' | 'DELETED';

// Item types that can be edited
export type ItemType =
	| 'codelists'
	| 'variables'
	| 'datasets'
	| 'methods'
	| 'comments'
	| 'valuelists'
	| 'whereclauses'
	| 'standards'
	| 'dictionaries'
	| 'documents'
	| 'analysisresults';

// Individual change record
export interface ChangeRecord {
	type: ChangeType;
	changes: Record<string, any>; // Field name -> new value
	timestamp: string;
	originalValues?: Record<string, any>; // For undo
}

// Changes organized by define type, item type, and OID
export interface ChangesData {
	[defineType: string]: {
		// 'adam' | 'sdtm'
		[itemType: string]: {
			// ItemType
			[oid: string]: ChangeRecord; // OID -> change record
		};
	};
}

// Undo/redo stack entry
interface HistoryEntry {
	defineType: DefineType;
	itemType: ItemType;
	oid: string;
	change: ChangeRecord;
}

// State (exported for testing)
export class EditState {
	editMode = $state(false);
	changes = $state<ChangesData>({});
	undoStack = $state<HistoryEntry[]>([]);
	redoStack = $state<HistoryEntry[]>([]);

	// Derived: check if item has been modified
	hasChanges(defineType: DefineType, itemType: ItemType, oid: string): boolean {
		return !!this.changes[defineType]?.[itemType]?.[oid];
	}

	// Derived: get change for an item
	getChange(defineType: DefineType, itemType: ItemType, oid: string): ChangeRecord | null {
		return this.changes[defineType]?.[itemType]?.[oid] || null;
	}

	// Derived: count total changes
	getTotalChanges(): number {
		let count = 0;
		for (const defineType in this.changes) {
			for (const itemType in this.changes[defineType]) {
				count += Object.keys(this.changes[defineType][itemType]).length;
			}
		}
		return count;
	}

	// Derived: get all modified OIDs for a given item type
	getModifiedOIDs(defineType: DefineType, itemType: ItemType): string[] {
		return Object.keys(this.changes[defineType]?.[itemType] || {});
	}

	// Toggle edit mode
	toggleEditMode() {
		this.editMode = !this.editMode;
		console.log('[EditState] Edit mode:', this.editMode ? 'ON' : 'OFF');
		this.persist();
	}

	// Enable edit mode
	enableEditMode() {
		this.editMode = true;
		console.log('[EditState] Edit mode enabled');
		this.persist();
	}

	// Disable edit mode
	disableEditMode() {
		this.editMode = false;
		console.log('[EditState] Edit mode disabled');
		this.persist();
	}

	// Record a change
	recordChange(
		defineType: DefineType,
		itemType: ItemType,
		oid: string,
		fieldName: string,
		newValue: any,
		originalValue: any
	) {
		console.log(
			`[EditState] Recording change: ${defineType}.${itemType}.${oid}.${fieldName} = ${newValue}`
		);

		// Initialize nested structure if needed
		if (!this.changes[defineType]) {
			this.changes[defineType] = {};
		}
		if (!this.changes[defineType][itemType]) {
			this.changes[defineType][itemType] = {};
		}

		// Capture the PREVIOUS state before making changes (for undo)
		const previousChangeRecord = this.changes[defineType][itemType][oid];
		const previousState = previousChangeRecord
			? JSON.parse(JSON.stringify(previousChangeRecord))
			: null;

		// Get or create change record
		let changeRecord = this.changes[defineType][itemType][oid];
		if (!changeRecord) {
			changeRecord = {
				type: 'MODIFIED',
				changes: {},
				originalValues: {},
				timestamp: new Date().toISOString()
			};
			this.changes[defineType][itemType][oid] = changeRecord;
		}

		// Store previous value for undo (deep clone to avoid reference issues)
		if (changeRecord.originalValues && !(fieldName in changeRecord.originalValues)) {
			changeRecord.originalValues[fieldName] = this.deepClone(originalValue);
		}

		// Record the change (deep clone to avoid reference issues)
		changeRecord.changes[fieldName] = this.deepClone(newValue);
		changeRecord.timestamp = new Date().toISOString();

		// Add PREVIOUS state to undo stack (not current state)
		this.undoStack.push({
			defineType,
			itemType,
			oid,
			change: previousState
		});

		// Clear redo stack when new change is made
		this.redoStack = [];

		// Trigger reactivity
		this.changes = { ...this.changes };

		// Persist to localStorage
		this.persist();
	}

	// Record addition of new item
	recordAddition(defineType: DefineType, itemType: ItemType, oid: string, itemData: any) {
		console.log(`[EditState] Recording addition: ${defineType}.${itemType}.${oid}`);

		// Initialize nested structure if needed
		if (!this.changes[defineType]) {
			this.changes[defineType] = {};
		}
		if (!this.changes[defineType][itemType]) {
			this.changes[defineType][itemType] = {};
		}

		// Capture previous state (should be null for new additions)
		const previousChangeRecord = this.changes[defineType][itemType][oid];
		const previousState = previousChangeRecord
			? JSON.parse(JSON.stringify(previousChangeRecord))
			: null;

		// Create change record
		const changeRecord: ChangeRecord = {
			type: 'ADDED',
			changes: itemData,
			timestamp: new Date().toISOString()
		};

		this.changes[defineType][itemType][oid] = changeRecord;

		// Add PREVIOUS state to undo stack (not current state)
		this.undoStack.push({
			defineType,
			itemType,
			oid,
			change: previousState
		});

		// Clear redo stack
		this.redoStack = [];

		// Trigger reactivity
		this.changes = { ...this.changes };

		// Persist to localStorage
		this.persist();
	}

	// Record deletion of item
	recordDeletion(defineType: DefineType, itemType: ItemType, oid: string, originalData: any) {
		console.log(`[EditState] Recording deletion: ${defineType}.${itemType}.${oid}`);

		// Initialize nested structure if needed
		if (!this.changes[defineType]) {
			this.changes[defineType] = {};
		}
		if (!this.changes[defineType][itemType]) {
			this.changes[defineType][itemType] = {};
		}

		// Capture previous state before marking as deleted
		const previousChangeRecord = this.changes[defineType][itemType][oid];
		const previousState = previousChangeRecord
			? JSON.parse(JSON.stringify(previousChangeRecord))
			: null;

		// Create change record (store original data for undo)
		const changeRecord: ChangeRecord = {
			type: 'DELETED',
			changes: {},
			originalValues: originalData,
			timestamp: new Date().toISOString()
		};

		this.changes[defineType][itemType][oid] = changeRecord;

		// Add PREVIOUS state to undo stack (not current state)
		this.undoStack.push({
			defineType,
			itemType,
			oid,
			change: previousState
		});

		// Clear redo stack
		this.redoStack = [];

		// Trigger reactivity
		this.changes = { ...this.changes };

		// Persist to localStorage
		this.persist();
	}

	// Undo last change
	undo() {
		if (this.undoStack.length === 0) {
			console.log('[EditState] Nothing to undo');
			return;
		}

		const entry = this.undoStack.pop()!;
		console.log(`[EditState] Undoing change: ${entry.defineType}.${entry.itemType}.${entry.oid}`);

		// Capture current state for redo stack (before undoing)
		const currentState = this.changes[entry.defineType]?.[entry.itemType]?.[entry.oid];
		const redoEntry = {
			defineType: entry.defineType,
			itemType: entry.itemType,
			oid: entry.oid,
			change: currentState ? JSON.parse(JSON.stringify(currentState)) : null
		};
		this.redoStack.push(redoEntry);

		// Restore to previous state (stored in entry.change)
		if (entry.change === null) {
			// Previous state was "no change record" - delete it
			delete this.changes[entry.defineType][entry.itemType][entry.oid];

			// Clean up empty objects
			if (Object.keys(this.changes[entry.defineType][entry.itemType]).length === 0) {
				delete this.changes[entry.defineType][entry.itemType];
			}
			if (Object.keys(this.changes[entry.defineType]).length === 0) {
				delete this.changes[entry.defineType];
			}
			console.log('[EditState] Removed change record (no prior state)');
		} else {
			// Previous state existed - restore it completely
			if (!this.changes[entry.defineType]) {
				this.changes[entry.defineType] = {};
			}
			if (!this.changes[entry.defineType][entry.itemType]) {
				this.changes[entry.defineType][entry.itemType] = {};
			}
			this.changes[entry.defineType][entry.itemType][entry.oid] = JSON.parse(
				JSON.stringify(entry.change)
			);
			console.log('[EditState] Restored to previous state');
		}

		// Trigger reactivity
		this.changes = { ...this.changes };

		// Persist to localStorage
		this.persist();
	}

	// Redo last undone change
	redo() {
		if (this.redoStack.length === 0) {
			console.log('[EditState] Nothing to redo');
			return;
		}

		const entry = this.redoStack.pop()!;
		console.log(`[EditState] Redoing change: ${entry.defineType}.${entry.itemType}.${entry.oid}`);

		// Capture current state for undo stack (before redoing)
		const currentState = this.changes[entry.defineType]?.[entry.itemType]?.[entry.oid];
		const undoEntry = {
			defineType: entry.defineType,
			itemType: entry.itemType,
			oid: entry.oid,
			change: currentState ? JSON.parse(JSON.stringify(currentState)) : null
		};
		this.undoStack.push(undoEntry);

		// Restore to redo state (stored in entry.change)
		if (entry.change === null) {
			// Redo state was "no change record" - delete it
			delete this.changes[entry.defineType][entry.itemType][entry.oid];

			// Clean up empty objects
			if (Object.keys(this.changes[entry.defineType][entry.itemType]).length === 0) {
				delete this.changes[entry.defineType][entry.itemType];
			}
			if (Object.keys(this.changes[entry.defineType]).length === 0) {
				delete this.changes[entry.defineType];
			}
			console.log('[EditState] Removed change record (redo to no change)');
		} else {
			// Redo state existed - restore it completely
			if (!this.changes[entry.defineType]) {
				this.changes[entry.defineType] = {};
			}
			if (!this.changes[entry.defineType][entry.itemType]) {
				this.changes[entry.defineType][entry.itemType] = {};
			}
			this.changes[entry.defineType][entry.itemType][entry.oid] = JSON.parse(
				JSON.stringify(entry.change)
			);
			console.log('[EditState] Restored to redo state');
		}

		// Trigger reactivity
		this.changes = { ...this.changes };

		// Persist to localStorage
		this.persist();
	}

	// Clear all changes
	clearChanges() {
		console.log('[EditState] Clearing all changes');
		this.changes = {};
		this.undoStack = [];
		this.redoStack = [];

		// Clear from localStorage
		if (typeof window !== 'undefined') {
			localStorage.removeItem('metadata-browser-changes');
		}
	}

	// Discard changes for a specific item
	discardItemChanges(defineType: DefineType, itemType: ItemType, oid: string) {
		console.log(
			`[EditState] Discarding changes for: ${defineType}.${itemType}.${oid}`
		);

		if (this.changes[defineType]?.[itemType]?.[oid]) {
			delete this.changes[defineType][itemType][oid];

			// Clean up empty objects
			if (Object.keys(this.changes[defineType][itemType]).length === 0) {
				delete this.changes[defineType][itemType];
			}
			if (Object.keys(this.changes[defineType]).length === 0) {
				delete this.changes[defineType];
			}

			// Trigger reactivity
			this.changes = { ...this.changes };

			// Persist to localStorage
			this.persist();
		}
	}

	// Reinstate a deleted item (preserving any edits made before deletion)
	reinstateItem(defineType: DefineType, itemType: ItemType, oid: string) {
		console.log(
			`[EditState] Reinstating item: ${defineType}.${itemType}.${oid}`
		);

		const changeRecord = this.changes[defineType]?.[itemType]?.[oid];
		if (!changeRecord) {
			console.log('[EditState] No change record found to reinstate');
			return;
		}

		if (changeRecord.type !== 'DELETED') {
			console.log('[EditState] Item is not deleted, nothing to reinstate');
			return;
		}

		// If there were modifications before deletion, restore them
		// Check if there are actual user edits (changes object has values)
		const hadPriorEdits = changeRecord.changes && Object.keys(changeRecord.changes).length > 0;
		if (hadPriorEdits) {
			// Convert back to MODIFIED, keeping the original changes
			changeRecord.type = 'MODIFIED';
			// The changes field should already have the modified values
			// originalValues has the pre-modification values for undo
			console.log('[EditState] Restored to MODIFIED state with preserved edits');
		} else {
			// No prior modifications, just remove the deletion entirely
			delete this.changes[defineType][itemType][oid];

			// Clean up empty objects
			if (Object.keys(this.changes[defineType][itemType]).length === 0) {
				delete this.changes[defineType][itemType];
			}
			if (Object.keys(this.changes[defineType]).length === 0) {
				delete this.changes[defineType];
			}
			console.log('[EditState] Removed deletion record (no prior edits)');
		}

		// Trigger reactivity
		this.changes = { ...this.changes };

		// Persist to localStorage
		this.persist();
	}

	// Persist changes to localStorage
	persist() {
		if (typeof window === 'undefined') return;

		try {
			localStorage.setItem('metadata-browser-changes', JSON.stringify(this.changes));
			localStorage.setItem('metadata-browser-edit-mode', JSON.stringify(this.editMode));
			localStorage.setItem('metadata-browser-undo-stack', JSON.stringify(this.undoStack));
			localStorage.setItem('metadata-browser-redo-stack', JSON.stringify(this.redoStack));
			console.log('[EditState] Changes, edit mode, and undo/redo stacks persisted to localStorage');
		} catch (error) {
			console.error('[EditState] Failed to persist changes:', error);
		}
	}

	// Load changes from localStorage
	load() {
		if (typeof window === 'undefined') return;

		try {
			const stored = localStorage.getItem('metadata-browser-changes');
			if (stored) {
				this.changes = JSON.parse(stored);
				console.log('[EditState] Changes loaded from localStorage');
			}

			const editModeStored = localStorage.getItem('metadata-browser-edit-mode');
			if (editModeStored) {
				this.editMode = JSON.parse(editModeStored);
				console.log('[EditState] Edit mode loaded from localStorage:', this.editMode);
			}

			const undoStackStored = localStorage.getItem('metadata-browser-undo-stack');
			if (undoStackStored) {
				this.undoStack = JSON.parse(undoStackStored);
				console.log('[EditState] Undo stack loaded from localStorage:', this.undoStack.length, 'entries');
			}

			const redoStackStored = localStorage.getItem('metadata-browser-redo-stack');
			if (redoStackStored) {
				this.redoStack = JSON.parse(redoStackStored);
				console.log('[EditState] Redo stack loaded from localStorage:', this.redoStack.length, 'entries');
			}
		} catch (error) {
			console.error('[EditState] Failed to load changes:', error);
			this.changes = {};
		}
	}

	// Export changes as JSON
	exportChanges(): string {
		return JSON.stringify(this.changes, null, 2);
	}

	// Import changes from JSON
	importChanges(json: string) {
		try {
			const imported = JSON.parse(json);
			this.changes = imported;
			this.persist();
			console.log('[EditState] Changes imported successfully');
		} catch (error) {
			console.error('[EditState] Failed to import changes:', error);
			throw error;
		}
	}

	// Deep clone utility for arrays and objects
	// Uses JSON serialization for simplicity and consistency with undo stack
	private deepClone<T>(value: T): T {
		// Primitives don't need cloning
		if (value === null || typeof value !== 'object') {
			return value;
		}
		// Arrays and objects: deep clone via JSON
		return JSON.parse(JSON.stringify(value));
	}
}

// Create singleton instance
export const editState = new EditState();

// Load persisted changes on initialization (browser only)
if (typeof window !== 'undefined') {
	editState.load();

	// Expose to window for console debugging
	(window as any).__editState = editState;
	console.log('[EditState] 🔧 Debug access: window.__editState');
}
