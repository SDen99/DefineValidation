/**
 * Unit Tests for ItemRef Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	getEditableItemRefs,
	addVariableToDataset,
	removeVariableFromDataset,
	updateItemRef,
	reorderVariableInDataset,
	isVariableInDataset,
	getNextOrderNumber
} from './itemRefManager';
import { EditState } from '$lib/core/state/metadata/editState.svelte';
import type { ItemGroup, ItemRef } from '@sden99/cdisc-types/define-xml';

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
		}
	};
})();

if (typeof window === 'undefined') {
	(global as any).window = { localStorage: localStorageMock };
}

describe('ItemRef Manager', () => {
	let editState: EditState;
	let mockDataset: ItemGroup;

	beforeEach(() => {
		localStorageMock.clear();
		editState = new EditState();

		// Clear any existing changes
		editState.clearChanges();

		// Mock dataset with some variables
		mockDataset = {
			OID: 'IG.ADSL',
			Name: 'ADSL',
			Repeating: 'No',
			ItemRefs: [
				{
					OID: 'IT.ADSL.STUDYID',
					Mandatory: 'Yes',
					OrderNumber: '1',
					KeySequence: null,
					MethodOID: null,
					WhereClauseOID: null,
					Role: null,
					RoleCodeListOID: null
				},
				{
					OID: 'IT.ADSL.USUBJID',
					Mandatory: 'Yes',
					OrderNumber: '2',
					KeySequence: null,
					MethodOID: null,
					WhereClauseOID: null,
					Role: null,
					RoleCodeListOID: null
				}
			]
		} as ItemGroup;
	});

	describe('getEditableItemRefs', () => {
		it('should return original ItemRefs when no changes', () => {
			const refs = getEditableItemRefs(mockDataset, 'adam', editState);
			expect(refs).toHaveLength(2);
			expect(refs[0].OID).toBe('IT.ADSL.STUDYID');
			expect(refs[1].OID).toBe('IT.ADSL.USUBJID');
		});

		it('should return empty array for undefined dataset', () => {
			const refs = getEditableItemRefs(undefined, 'adam', editState);
			expect(refs).toHaveLength(0);
		});

		it('should mark added items', () => {
			// Add a variable
			addVariableToDataset(mockDataset, 'IT.ADSL.AGE', 'adam', {}, editState);

			const refs = getEditableItemRefs(mockDataset, 'adam', editState);
			expect(refs).toHaveLength(3);

			const addedRef = refs.find((r) => r.OID === 'IT.ADSL.AGE');
			expect(addedRef?._isAdded).toBe(true);
			expect(addedRef?._isModified).toBe(false);
		});
	});

	describe('addVariableToDataset', () => {
		it('should add variable with correct OrderNumber', () => {
			addVariableToDataset(mockDataset, 'IT.ADSL.AGE', 'adam', {}, editState);

			const refs = getEditableItemRefs(mockDataset, 'adam', editState);
			expect(refs).toHaveLength(3);

			const newRef = refs.find((r) => r.OID === 'IT.ADSL.AGE');
			expect(newRef?.OrderNumber).toBe('3');
			expect(newRef?.Mandatory).toBe('No');
		});

		it('should allow custom options', () => {
			addVariableToDataset(mockDataset, 'IT.ADSL.SUBJID', 'adam', {
				Mandatory: 'Yes',
				KeySequence: '1'
			}, editState);

			const refs = getEditableItemRefs(mockDataset, 'adam', editState);
			const newRef = refs.find((r) => r.OID === 'IT.ADSL.SUBJID');
			expect(newRef?.Mandatory).toBe('Yes');
			expect(newRef?.KeySequence).toBe('1');
		});

		it('should not add duplicate variables', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			addVariableToDataset(mockDataset, 'IT.ADSL.STUDYID', 'adam', {}, editState);

			const refs = getEditableItemRefs(mockDataset, 'adam', editState);
			expect(refs).toHaveLength(2); // Should still be 2

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('already in dataset')
			);

			consoleSpy.mockRestore();
		});
	});

	describe('removeVariableFromDataset', () => {
		it('should remove variable and renumber', () => {
			removeVariableFromDataset(mockDataset, 'IT.ADSL.STUDYID', 'adam', editState);

			const refs = getEditableItemRefs(mockDataset, 'adam', editState);
			expect(refs).toHaveLength(1);
			expect(refs[0].OID).toBe('IT.ADSL.USUBJID');
			expect(refs[0].OrderNumber).toBe('1'); // Should be renumbered
		});

		it('should handle removing non-existent variable gracefully', () => {
			removeVariableFromDataset(mockDataset, 'IT.ADSL.NONEXISTENT', 'adam', editState);

			const refs = getEditableItemRefs(mockDataset, 'adam', editState);
			expect(refs).toHaveLength(2); // Should still have original 2
		});
	});

	describe('updateItemRef', () => {
		it('should update ItemRef properties', () => {
			updateItemRef(mockDataset, 'IT.ADSL.STUDYID', 'adam', {
				Mandatory: 'No',
				KeySequence: '1'
			}, editState);

			const refs = getEditableItemRefs(mockDataset, 'adam', editState);
			const updated = refs.find((r) => r.OID === 'IT.ADSL.STUDYID');
			expect(updated?.Mandatory).toBe('No');
			expect(updated?.KeySequence).toBe('1');
		});

		it('should not affect other ItemRefs', () => {
			updateItemRef(mockDataset, 'IT.ADSL.STUDYID', 'adam', {
				Mandatory: 'No'
			}, editState);

			const refs = getEditableItemRefs(mockDataset, 'adam', editState);
			const other = refs.find((r) => r.OID === 'IT.ADSL.USUBJID');
			expect(other?.Mandatory).toBe('Yes'); // Should remain unchanged
		});
	});

	describe('reorderVariableInDataset', () => {
		it('should reorder variables and renumber', () => {
			// Move first variable to second position
			reorderVariableInDataset(mockDataset, 0, 1, 'adam', editState);

			const refs = getEditableItemRefs(mockDataset, 'adam', editState);
			expect(refs[0].OID).toBe('IT.ADSL.USUBJID');
			expect(refs[0].OrderNumber).toBe('1');
			expect(refs[1].OID).toBe('IT.ADSL.STUDYID');
			expect(refs[1].OrderNumber).toBe('2');
		});

		it('should handle invalid indices gracefully', () => {
			reorderVariableInDataset(mockDataset, 0, 10, 'adam', editState);

			const refs = getEditableItemRefs(mockDataset, 'adam', editState);
			expect(refs).toHaveLength(2); // Should remain unchanged
		});

		it('should handle same from/to index', () => {
			reorderVariableInDataset(mockDataset, 0, 0, 'adam', editState);

			const refs = getEditableItemRefs(mockDataset, 'adam', editState);
			expect(refs).toHaveLength(2); // Should remain unchanged
		});
	});

	describe('isVariableInDataset', () => {
		it('should detect existing variables', () => {
			expect(isVariableInDataset(mockDataset, 'IT.ADSL.STUDYID', 'adam', editState)).toBe(true);
			expect(isVariableInDataset(mockDataset, 'IT.ADSL.USUBJID', 'adam', editState)).toBe(true);
		});

		it('should detect non-existing variables', () => {
			expect(isVariableInDataset(mockDataset, 'IT.ADSL.AGE', 'adam', editState)).toBe(false);
		});

		it('should detect added variables', () => {
			addVariableToDataset(mockDataset, 'IT.ADSL.AGE', 'adam', {}, editState);
			expect(isVariableInDataset(mockDataset, 'IT.ADSL.AGE', 'adam', editState)).toBe(true);
		});
	});

	describe('getNextOrderNumber', () => {
		it('should return next sequential number', () => {
			expect(getNextOrderNumber(mockDataset, 'adam', editState)).toBe('3');
		});

		it('should handle empty dataset', () => {
			const emptyDataset: ItemGroup = {
				OID: 'IG.ADAE',
				Name: 'ADAE',
				Repeating: 'No',
				ItemRefs: []
			} as ItemGroup;

			expect(getNextOrderNumber(emptyDataset, 'adam', editState)).toBe('1');
		});

		it('should handle non-sequential OrderNumbers', () => {
			const nonSeqDataset: ItemGroup = {
				OID: 'IG.ADAE',
				Name: 'ADAE',
				Repeating: 'No',
				ItemRefs: [
					{
						OID: 'IT.ADAE.STUDYID',
						Mandatory: 'Yes',
						OrderNumber: '1',
						KeySequence: null,
						MethodOID: null,
						WhereClauseOID: null,
						Role: null,
						RoleCodeListOID: null
					},
					{
						OID: 'IT.ADAE.USUBJID',
						Mandatory: 'Yes',
						OrderNumber: '10',
						KeySequence: null,
						MethodOID: null,
						WhereClauseOID: null,
						Role: null,
						RoleCodeListOID: null
					}
				]
			} as ItemGroup;

			expect(getNextOrderNumber(nonSeqDataset, 'adam', editState)).toBe('11');
		});
	});
});
