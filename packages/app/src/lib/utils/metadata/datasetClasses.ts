/**
 * Shared SDTM/ADaM dataset class definitions and abbreviation mapping.
 */

export interface DatasetClass {
	value: string;
	abbrev: string;
	standard: 'SDTM' | 'ADaM';
}

export const datasetClasses: DatasetClass[] = [
	// ADaM classes
	{ value: 'Basic Data Structure', abbrev: 'BDS', standard: 'ADaM' },
	{ value: 'Occurrence Data Structure', abbrev: 'OCCUR', standard: 'ADaM' },
	{ value: 'Subject Level Analysis Dataset', abbrev: 'SLAD', standard: 'ADaM' },
	{ value: 'Adam Other', abbrev: 'OTHER', standard: 'ADaM' },

	// SDTM classes
	{ value: 'Events', abbrev: 'EVT', standard: 'SDTM' },
	{ value: 'Interventions', abbrev: 'INT', standard: 'SDTM' },
	{ value: 'Findings', abbrev: 'FIND', standard: 'SDTM' },
	{ value: 'Findings About', abbrev: 'FA', standard: 'SDTM' },
	{ value: 'Special Purpose', abbrev: 'SP', standard: 'SDTM' },
	{ value: 'Trial Design', abbrev: 'TD', standard: 'SDTM' },
	{ value: 'Relationship', abbrev: 'REL', standard: 'SDTM' },
	{ value: 'Associated Persons', abbrev: 'AP', standard: 'SDTM' },
	{ value: 'Device', abbrev: 'DEV', standard: 'SDTM' }
];

// Build a lookup map for fast abbreviation resolution (case-insensitive)
const abbreviationMap = new Map<string, string>();
for (const cls of datasetClasses) {
	abbreviationMap.set(cls.value.toUpperCase(), cls.abbrev);
}

/**
 * Get the abbreviation for a dataset class type.
 * Falls back to the input string if no abbreviation is found.
 */
export function getClassAbbreviation(classType: string | undefined | null): string {
	if (!classType) return '';
	return abbreviationMap.get(classType.toUpperCase()) || classType;
}
