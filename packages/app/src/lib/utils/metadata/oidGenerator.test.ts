/**
 * Unit Tests for OID Generator
 */

import { describe, it, expect } from 'vitest';
import {
	generateVariableOID,
	generateDatasetOID,
	generateCodeListOID,
	generateMethodOID,
	generateCommentOID,
	isOIDUnique,
	isOIDUniqueGlobally,
	generateUniqueVariableOID,
	validateOIDFormat,
	extractDatasetFromVariableOID,
	extractVariableNameFromOID
} from './oidGenerator';
import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';

describe('OID Generation', () => {
	describe('generateVariableOID', () => {
		it('should generate correct variable OID pattern', () => {
			expect(generateVariableOID('ADSL', 'STUDYID')).toBe('IT.ADSL.STUDYID');
			expect(generateVariableOID('ADAE', 'USUBJID')).toBe('IT.ADAE.USUBJID');
		});

		it('should sanitize dataset and variable names', () => {
			expect(generateVariableOID('ad-sl', 'study id')).toBe('IT.AD_SL.STUDY_ID');
			expect(generateVariableOID('ADSL', 'study@id')).toBe('IT.ADSL.STUDY_ID');
		});

		it('should handle uppercase conversion', () => {
			expect(generateVariableOID('adsl', 'studyid')).toBe('IT.ADSL.STUDYID');
		});
	});

	describe('generateDatasetOID', () => {
		it('should generate correct dataset OID pattern', () => {
			expect(generateDatasetOID('ADSL')).toBe('IG.ADSL');
			expect(generateDatasetOID('ADAE')).toBe('IG.ADAE');
		});

		it('should sanitize dataset name', () => {
			expect(generateDatasetOID('ad-sl')).toBe('IG.AD_SL');
		});
	});

	describe('generateCodeListOID', () => {
		it('should generate correct codelist OID pattern', () => {
			expect(generateCodeListOID('COUNTRY')).toBe('CL.COUNTRY');
			expect(generateCodeListOID('SEX')).toBe('CL.SEX');
		});
	});

	describe('generateMethodOID', () => {
		it('should generate correct method OID pattern', () => {
			expect(generateMethodOID('BASELINE_CALC')).toBe('MT.BASELINE_CALC');
			expect(generateMethodOID('Baseline Calculation')).toBe('MT.BASELINE_CALCULATION');
		});
	});

	describe('generateCommentOID', () => {
		it('should generate correct comment OID pattern', () => {
			expect(generateCommentOID('CO', 'ADSL_ACOUNTRY')).toBe('COM.CO.ADSL_ACOUNTRY');
		});
	});
});

describe('OID Uniqueness', () => {
	const mockDefineData: ParsedDefineXML = {
		ItemDefs: [
			{ OID: 'IT.ADSL.STUDYID', Name: 'STUDYID', DataType: 'text', Length: '10' },
			{ OID: 'IT.ADSL.USUBJID', Name: 'USUBJID', DataType: 'text', Length: '20' }
		],
		ItemGroups: [{ OID: 'IG.ADSL', Name: 'ADSL', Repeating: 'No', ItemRefs: [] }],
		CodeLists: [{ OID: 'CL.COUNTRY', Name: 'Country', DataType: 'text', CodeListItems: [] }]
	} as any;

	describe('isOIDUnique', () => {
		it('should detect existing OIDs', () => {
			expect(isOIDUnique('IT.ADSL.STUDYID', 'ItemDefs', mockDefineData)).toBe(false);
			expect(isOIDUnique('IG.ADSL', 'ItemGroups', mockDefineData)).toBe(false);
			expect(isOIDUnique('CL.COUNTRY', 'CodeLists', mockDefineData)).toBe(false);
		});

		it('should detect unique OIDs', () => {
			expect(isOIDUnique('IT.ADSL.NEWVAR', 'ItemDefs', mockDefineData)).toBe(true);
			expect(isOIDUnique('IG.ADAE', 'ItemGroups', mockDefineData)).toBe(true);
			expect(isOIDUnique('CL.SEX', 'CodeLists', mockDefineData)).toBe(true);
		});

		it('should handle null defineData', () => {
			expect(isOIDUnique('IT.ADSL.STUDYID', 'ItemDefs', null)).toBe(false);
		});

		it('should handle empty OID', () => {
			expect(isOIDUnique('', 'ItemDefs', mockDefineData)).toBe(false);
		});
	});

	describe('isOIDUniqueGlobally', () => {
		it('should check across both ADaM and SDTM', () => {
			expect(isOIDUniqueGlobally('IT.ADSL.NEWVAR', 'ItemDefs', mockDefineData, null)).toBe(
				true
			);
			expect(isOIDUniqueGlobally('IT.ADSL.STUDYID', 'ItemDefs', mockDefineData, null)).toBe(
				false
			);
		});
	});

	describe('generateUniqueVariableOID', () => {
		it('should return base OID if unique', () => {
			const result = generateUniqueVariableOID('ADSL', 'NEWVAR', mockDefineData);
			expect(result).toBe('IT.ADSL.NEWVAR');
		});

		it('should add numeric suffix if base OID exists', () => {
			const result = generateUniqueVariableOID('ADSL', 'STUDYID', mockDefineData);
			expect(result).toBe('IT.ADSL.STUDYID_1');
		});

		it('should return null if cannot generate unique OID', () => {
			// Create a Define with many conflicts
			const fullDefine: ParsedDefineXML = {
				ItemDefs: Array.from({ length: 105 }, (_, i) => ({
					OID: i === 0 ? 'IT.ADSL.TEST' : `IT.ADSL.TEST_${i}`,
					Name: 'TEST',
					DataType: 'text',
					Length: '10'
				}))
			} as any;

			const result = generateUniqueVariableOID('ADSL', 'TEST', fullDefine);
			expect(result).toBeNull();
		});
	});
});

describe('OID Validation', () => {
	describe('validateOIDFormat', () => {
		it('should accept valid OIDs', () => {
			expect(validateOIDFormat('IT.ADSL.STUDYID').isValid).toBe(true);
			expect(validateOIDFormat('IG.ADSL').isValid).toBe(true);
			expect(validateOIDFormat('CL.COUNTRY').isValid).toBe(true);
			expect(validateOIDFormat('MT.BASELINE_CALC').isValid).toBe(true);
		});

		it('should reject empty OIDs', () => {
			const result = validateOIDFormat('');
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('empty');
		});

		it('should reject OIDs with invalid characters', () => {
			const result = validateOIDFormat('IT.ADSL.STUDY@ID');
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('letters, numbers');
		});

		it('should reject OIDs that are too long', () => {
			const longOID = 'IT.' + 'A'.repeat(130);
			const result = validateOIDFormat(longOID);
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('too long');
		});

		it('should accept OIDs with dots, underscores, and hyphens', () => {
			expect(validateOIDFormat('IT.ADSL.STUDY_ID').isValid).toBe(true);
			expect(validateOIDFormat('IT.AD-SL.STUDYID').isValid).toBe(true);
			expect(validateOIDFormat('IT.ADSL.STUDY.ID').isValid).toBe(true);
		});
	});
});

describe('OID Extraction', () => {
	describe('extractDatasetFromVariableOID', () => {
		it('should extract dataset name from variable OID', () => {
			expect(extractDatasetFromVariableOID('IT.ADSL.STUDYID')).toBe('ADSL');
			expect(extractDatasetFromVariableOID('IT.ADAE.USUBJID')).toBe('ADAE');
		});

		it('should return null for invalid patterns', () => {
			expect(extractDatasetFromVariableOID('IG.ADSL')).toBeNull();
			expect(extractDatasetFromVariableOID('INVALID')).toBeNull();
		});
	});

	describe('extractVariableNameFromOID', () => {
		it('should extract variable name from OID', () => {
			expect(extractVariableNameFromOID('IT.ADSL.STUDYID')).toBe('STUDYID');
			expect(extractVariableNameFromOID('IT.ADAE.USUBJID')).toBe('USUBJID');
		});

		it('should handle complex variable names', () => {
			expect(extractVariableNameFromOID('IT.ADSL.STUDY_ID_V2')).toBe('STUDY_ID_V2');
		});

		it('should return null for invalid patterns', () => {
			expect(extractVariableNameFromOID('IG.ADSL')).toBeNull();
			expect(extractVariableNameFromOID('INVALID')).toBeNull();
		});
	});
});
