import type { CodeList } from '@sden99/cdisc-types/define-xml';

export type VariableSource = 'both' | 'data-only' | 'define-only';

export interface MergedVariable {
	name: string;
	source: VariableSource;

	// Data-side
	pandasDtype: string | null;
	visible: boolean;

	// Define-XML side (all null if data-only)
	label: string | null;
	cdiscDataType: string | null;
	length: string | null;
	mandatory: string | null;
	role: string | null;
	orderNumber: number | null;
	originType: string | null;
	codeList: CodeList | null;
	isKey: boolean;
}
