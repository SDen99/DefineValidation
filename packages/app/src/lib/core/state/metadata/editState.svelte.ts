/**
 * Metadata Edit State Module
 *
 * Manages editing state, change tracking, and undo/redo functionality for Define-XML metadata.
 *
 * Moved from prototype to shared lib for use across the application.
 * Original: packages/app/src/routes/dev/metadata-browser-prototype/editState.svelte.ts
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
		this.persist();
	}

	// Enable edit mode
	enableEditMode() {
		this.editMode = true;
		this.persist();
	}

	// Disable edit mode
	disableEditMode() {
		this.editMode = false;
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
		}

		// Ensure originalValues is captured before checking for revert
		const originalValues = {
			...changeRecord.originalValues,
			// Only add if not already present
			...(!(fieldName in (changeRecord.originalValues || {}))
				? { [fieldName]: this.deepClone(originalValue) }
				: {})
		};

		// Check if new value matches the original - if so, this field reverts to unchanged
		const storedOriginal = originalValues[fieldName];
		const valuesMatch = JSON.stringify(newValue) === JSON.stringify(storedOriginal);

		let updatedChanges = { ...changeRecord.changes };
		if (valuesMatch) {
			// Field reverted to original - remove it from changes
			delete updatedChanges[fieldName];
		} else {
			updatedChanges[fieldName] = this.deepClone(newValue);
		}

		// Add PREVIOUS state to undo stack (not current state)
		this.undoStack.push({
			defineType,
			itemType,
			oid,
			change: previousState
		});

		// Clear redo stack when new change is made
		this.redoStack = [];

		// If no fields remain changed, remove the entire change record
		if (Object.keys(updatedChanges).length === 0) {
			const { [oid]: removed, ...restOids } = this.changes[defineType][itemType];
			const hasRemainingOids = Object.keys(restOids).length > 0;

			if (hasRemainingOids) {
				this.changes = {
					...this.changes,
					[defineType]: {
						...this.changes[defineType],
						[itemType]: restOids
					}
				};
			} else {
				const { [itemType]: removedType, ...restItemTypes } = this.changes[defineType];
				const hasRemainingItemTypes = Object.keys(restItemTypes).length > 0;

				if (hasRemainingItemTypes) {
					this.changes = {
						...this.changes,
						[defineType]: restItemTypes
					};
				} else {
					const { [defineType]: removedDefine, ...restDefineTypes } = this.changes;
					this.changes = restDefineTypes;
				}
			}
		} else {
			// Create updated change record
			const updatedChangeRecord = {
				...changeRecord,
				changes: updatedChanges,
				originalValues,
				timestamp: new Date().toISOString()
			};

			// Trigger reactivity - create new references all the way down
			this.changes = {
				...this.changes,
				[defineType]: {
					...this.changes[defineType],
					[itemType]: {
						...this.changes[defineType][itemType],
						[oid]: updatedChangeRecord
					}
				}
			};
		}

		// Persist to localStorage
		this.persist();
	}

	// Record addition of new item
	recordAddition(defineType: DefineType, itemType: ItemType, oid: string, itemData: any) {
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

		// Add PREVIOUS state to undo stack (not current state)
		this.undoStack.push({
			defineType,
			itemType,
			oid,
			change: previousState
		});

		// Clear redo stack
		this.redoStack = [];

		// Trigger reactivity - create new references all the way down
		this.changes = {
			...this.changes,
			[defineType]: {
				...this.changes[defineType],
				[itemType]: {
					...this.changes[defineType][itemType],
					[oid]: changeRecord
				}
			}
		};

		// Persist to localStorage
		this.persist();
	}

	// Record deletion of item
	recordDeletion(defineType: DefineType, itemType: ItemType, oid: string, originalData: any) {
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

		// Create change record (preserve any prior edits for reinstatement)
		const changeRecord: ChangeRecord = {
			type: 'DELETED',
			// Preserve changes from previous MODIFIED record (if any)
			changes: previousChangeRecord?.changes || {},
			// Preserve originalValues from previous MODIFIED record, or use originalData
			originalValues: previousChangeRecord?.originalValues || originalData,
			timestamp: new Date().toISOString()
		};

		// Add PREVIOUS state to undo stack (not current state)
		this.undoStack.push({
			defineType,
			itemType,
			oid,
			change: previousState
		});

		// Clear redo stack
		this.redoStack = [];

		// Trigger reactivity - create new references all the way down
		this.changes = {
			...this.changes,
			[defineType]: {
				...this.changes[defineType],
				[itemType]: {
					...this.changes[defineType][itemType],
					[oid]: changeRecord
				}
			}
		};

		// Persist to localStorage
		this.persist();
	}

	// Undo last change
	undo() {
		if (this.undoStack.length === 0) return;

		const entry = this.undoStack.pop()!;

		// Capture current state for redo stack (before undoing)
		const currentState = this.changes[entry.defineType]?.[entry.itemType]?.[entry.oid];
		const redoEntry = {
			defineType: entry.defineType,
			itemType: entry.itemType,
			oid: entry.oid,
			change: currentState ? JSON.parse(JSON.stringify(currentState)) : null
		};
		this.redoStack.push(redoEntry);

		// Restore to previous state (stored in entry.change) - with proper reactivity
		if (entry.change === null) {
			// Previous state was "no change record" - remove it with immutable update
			const { [entry.oid]: removed, ...restOids } = this.changes[entry.defineType]?.[entry.itemType] || {};
			const hasRemainingOids = Object.keys(restOids).length > 0;

			if (hasRemainingOids) {
				this.changes = {
					...this.changes,
					[entry.defineType]: {
						...this.changes[entry.defineType],
						[entry.itemType]: restOids
					}
				};
			} else {
				// Remove entire itemType if empty
				const { [entry.itemType]: removedType, ...restItemTypes } = this.changes[entry.defineType] || {};
				const hasRemainingItemTypes = Object.keys(restItemTypes).length > 0;

				if (hasRemainingItemTypes) {
					this.changes = {
						...this.changes,
						[entry.defineType]: restItemTypes
					};
				} else {
					// Remove entire defineType if empty
					const { [entry.defineType]: removedDefine, ...restDefineTypes } = this.changes;
					this.changes = restDefineTypes;
				}
			}
		} else {
			// Previous state existed - restore it with immutable update
			this.changes = {
				...this.changes,
				[entry.defineType]: {
					...(this.changes[entry.defineType] || {}),
					[entry.itemType]: {
						...(this.changes[entry.defineType]?.[entry.itemType] || {}),
						[entry.oid]: JSON.parse(JSON.stringify(entry.change))
					}
				}
			};
		}

		// Persist to localStorage
		this.persist();
	}

	// Redo last undone change
	redo() {
		if (this.redoStack.length === 0) return;

		const entry = this.redoStack.pop()!;

		// Capture current state for undo stack (before redoing)
		const currentState = this.changes[entry.defineType]?.[entry.itemType]?.[entry.oid];
		const undoEntry = {
			defineType: entry.defineType,
			itemType: entry.itemType,
			oid: entry.oid,
			change: currentState ? JSON.parse(JSON.stringify(currentState)) : null
		};
		this.undoStack.push(undoEntry);

		// Restore to redo state (stored in entry.change) - with proper reactivity
		if (entry.change === null) {
			// Redo state was "no change record" - remove it with immutable update
			const { [entry.oid]: removed, ...restOids } = this.changes[entry.defineType]?.[entry.itemType] || {};
			const hasRemainingOids = Object.keys(restOids).length > 0;

			if (hasRemainingOids) {
				this.changes = {
					...this.changes,
					[entry.defineType]: {
						...this.changes[entry.defineType],
						[entry.itemType]: restOids
					}
				};
			} else {
				// Remove entire itemType if empty
				const { [entry.itemType]: removedType, ...restItemTypes } = this.changes[entry.defineType] || {};
				const hasRemainingItemTypes = Object.keys(restItemTypes).length > 0;

				if (hasRemainingItemTypes) {
					this.changes = {
						...this.changes,
						[entry.defineType]: restItemTypes
					};
				} else {
					// Remove entire defineType if empty
					const { [entry.defineType]: removedDefine, ...restDefineTypes } = this.changes;
					this.changes = restDefineTypes;
				}
			}
		} else {
			// Redo state existed - restore it with immutable update
			this.changes = {
				...this.changes,
				[entry.defineType]: {
					...(this.changes[entry.defineType] || {}),
					[entry.itemType]: {
						...(this.changes[entry.defineType]?.[entry.itemType] || {}),
						[entry.oid]: JSON.parse(JSON.stringify(entry.change))
					}
				}
			};
		}

		// Persist to localStorage
		this.persist();
	}

	// Clear all changes
	clearChanges() {
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
		if (this.changes[defineType]?.[itemType]?.[oid]) {
			// Remove item with immutable update
			const { [oid]: removed, ...restOids } = this.changes[defineType][itemType];
			const hasRemainingOids = Object.keys(restOids).length > 0;

			if (hasRemainingOids) {
				this.changes = {
					...this.changes,
					[defineType]: {
						...this.changes[defineType],
						[itemType]: restOids
					}
				};
			} else {
				// Remove entire itemType if empty
				const { [itemType]: removedType, ...restItemTypes } = this.changes[defineType];
				const hasRemainingItemTypes = Object.keys(restItemTypes).length > 0;

				if (hasRemainingItemTypes) {
					this.changes = {
						...this.changes,
						[defineType]: restItemTypes
					};
				} else {
					// Remove entire defineType if empty
					const { [defineType]: removedDefine, ...restDefineTypes } = this.changes;
					this.changes = restDefineTypes;
				}
			}

			// Persist to localStorage
			this.persist();
		}
	}

	// Reinstate a deleted item (preserving any edits made before deletion)
	reinstateItem(defineType: DefineType, itemType: ItemType, oid: string) {
		const changeRecord = this.changes[defineType]?.[itemType]?.[oid];
		if (!changeRecord) return;

		if (changeRecord.type !== 'DELETED') return;

		// If there were modifications before deletion, restore them
		// Check if there are actual user edits (changes object has values)
		const hadPriorEdits = changeRecord.changes && Object.keys(changeRecord.changes).length > 0;
		if (hadPriorEdits) {
			// Convert back to MODIFIED, keeping the original changes - with immutable update
			const updatedChangeRecord = {
				...changeRecord,
				type: 'MODIFIED' as const
			};

			this.changes = {
				...this.changes,
				[defineType]: {
					...this.changes[defineType],
					[itemType]: {
						...this.changes[defineType][itemType],
						[oid]: updatedChangeRecord
					}
				}
			};
		} else {
			// No prior modifications, just remove the deletion entirely - with immutable update
			const { [oid]: removed, ...restOids } = this.changes[defineType][itemType];
			const hasRemainingOids = Object.keys(restOids).length > 0;

			if (hasRemainingOids) {
				this.changes = {
					...this.changes,
					[defineType]: {
						...this.changes[defineType],
						[itemType]: restOids
					}
				};
			} else {
				// Remove entire itemType if empty
				const { [itemType]: removedType, ...restItemTypes } = this.changes[defineType];
				const hasRemainingItemTypes = Object.keys(restItemTypes).length > 0;

				if (hasRemainingItemTypes) {
					this.changes = {
						...this.changes,
						[defineType]: restItemTypes
					};
				} else {
					// Remove entire defineType if empty
					const { [defineType]: removedDefine, ...restDefineTypes } = this.changes;
					this.changes = restDefineTypes;
				}
			}
		}

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
		} catch (error) {
			console.error('[MetadataEditState] Failed to persist changes:', error);
		}
	}

	// Load changes from localStorage
	load() {
		if (typeof window === 'undefined') return;

		try {
			const stored = localStorage.getItem('metadata-browser-changes');
			if (stored) {
				this.changes = JSON.parse(stored);
			}

			const editModeStored = localStorage.getItem('metadata-browser-edit-mode');
			if (editModeStored) {
				this.editMode = JSON.parse(editModeStored);
			}

			const undoStackStored = localStorage.getItem('metadata-browser-undo-stack');
			if (undoStackStored) {
				this.undoStack = JSON.parse(undoStackStored);
			}

			const redoStackStored = localStorage.getItem('metadata-browser-redo-stack');
			if (redoStackStored) {
				this.redoStack = JSON.parse(redoStackStored);
			}
		} catch (error) {
			console.error('[MetadataEditState] Failed to load changes:', error);
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
		} catch (error) {
			console.error('[MetadataEditState] Failed to import changes:', error);
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
export const metadataEditState = new EditState();

// Load persisted changes on initialization (browser only)
if (typeof window !== 'undefined') {
	metadataEditState.load();
}
