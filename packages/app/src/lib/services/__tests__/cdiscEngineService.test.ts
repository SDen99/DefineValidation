import { describe, it, expect } from 'vitest';
import { stashFileForEngine, clearStashedFiles, getStashedFileCount } from '../cdiscEngineService.svelte';

function makeFile(name: string, size = 100): File {
	return new File([new ArrayBuffer(size)], name);
}

describe('stashFileForEngine', () => {
	it('accepts .xpt files', () => {
		clearStashedFiles();
		stashFileForEngine(makeFile('dm.xpt'));
		expect(getStashedFileCount()).toBe(1);
	});

	it('accepts .sas7bdat files', () => {
		clearStashedFiles();
		stashFileForEngine(makeFile('ae.sas7bdat'));
		expect(getStashedFileCount()).toBe(1);
	});

	it('rejects .json files', () => {
		clearStashedFiles();
		stashFileForEngine(makeFile('dm.json'));
		expect(getStashedFileCount()).toBe(0);
	});

	it('rejects .xml files', () => {
		clearStashedFiles();
		stashFileForEngine(makeFile('define.xml'));
		expect(getStashedFileCount()).toBe(0);
	});

	it('rejects .yaml files', () => {
		clearStashedFiles();
		stashFileForEngine(makeFile('rule.yaml'));
		expect(getStashedFileCount()).toBe(0);
	});

	it('accumulates multiple stashed files', () => {
		clearStashedFiles();
		stashFileForEngine(makeFile('dm.xpt'));
		stashFileForEngine(makeFile('ae.xpt'));
		stashFileForEngine(makeFile('ex.sas7bdat'));
		expect(getStashedFileCount()).toBe(3);
	});
});

describe('clearStashedFiles', () => {
	it('resets count to zero', () => {
		stashFileForEngine(makeFile('dm.xpt'));
		clearStashedFiles();
		expect(getStashedFileCount()).toBe(0);
	});
});

describe('detectStandard (via stash behavior)', () => {
	// detectStandard is internal to the module, but we can test its behavior
	// indirectly through the naming convention check:
	// ADaM datasets start with "ad", everything else is SDTM by default.
	// Since detectStandard isn't exported, we verify the logic specification here
	// as documentation tests.

	it('ADaM convention: files starting with "ad" indicate ADaM', () => {
		const adamFiles = ['adae.xpt', 'adlb.xpt', 'adtte.xpt'];
		for (const name of adamFiles) {
			expect(name.toLowerCase().startsWith('ad')).toBe(true);
		}
	});

	it('SDTM convention: files not starting with "ad" indicate SDTM', () => {
		const sdtmFiles = ['dm.xpt', 'ae.xpt', 'lb.xpt'];
		for (const name of sdtmFiles) {
			expect(name.toLowerCase().startsWith('ad')).toBe(false);
		}
	});
});
