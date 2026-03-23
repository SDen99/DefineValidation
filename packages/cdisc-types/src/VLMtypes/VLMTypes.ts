// vlm-types.ts - Type definitions for Value-Level Metadata processing
import type {
	ParsedDefineXML,
	ItemGroup,
	ItemDef,
	ItemRef,
	Method,
	CodeList,
	WhereClauseDef,
	ValueListDef,
	Comment,
	RangeCheck,
	ComparatorType
} from '../define-xml';

/**
 * Structure representing processed Value-Level Metadata for a dataset
 */
export interface ProcessedVLM {
	dataset: string;
	variables: Map<string, VLMVariable>;
}

/**
 * Structure representing a variable with Value-Level Metadata
 */
export interface VLMVariable {
	name: string;
	valueListDef: {
		OID: string;
		description?: string;
		ItemRefs: VLMItemRef[];
	};
	origin?: string;
	codeList?: string;
}

/**
 * Structure representing a parameter-specific item reference in Value-Level Metadata
 */
export interface VLMItemRef {
	paramcd: string;
	paramInfo?: {
		ordinal: number;
		codedValue: string;
		decode: string;
		isExternal: boolean;
	};
	whereClause?: {
		comparator: RangeCheck['Comparator'];
		checkValues: string[];
		whereClauseOID: string;
		OID: string;
		source: {
			domain: string;
			variable: string;
		};
	};
	methodOID?: string;
	valueListOID?: string;
	OID?: string;
	method?: VLMMethod
	origin?: {
		type: string;
		source: string | null;
		description?: string | null;
		translatedText?: string | null;
	};
	itemDescription?: string | null;
	mandatory: boolean;
	orderNumber: number;
	codelist?: {
		OID: string;
		name?: string;
		comment?: { text: string; oid: string };
		items?: Array<{
			codedValue: string;
			decode: string;
			isExtended?: boolean;
			orderNumber?: number;
		}>;
	};
	// Add comments to the VLMItemRef structure
	comments?: Array<{ text: string; oid: string }>;
	isNonParameterized?: boolean;
	specialVariables?: Record<string, string>;
	stratificationInfo?: Record<
		string,
		{
			comparator: ComparatorType;
			values: string[];
		}
	>;
}

/**
 * Result of processing a WhereClause, containing parameters and conditions
 */
export interface WhereClauseResult {
	paramcds: string[];
	conditions: Array<{
		variable: string;
		comparator: RangeCheck['Comparator'];
		values: string[];
	}>;
	stratificationVariables: Map<
		string,
		{
			comparator: RangeCheck['Comparator'];
			values: string[];
		}
	>;
	specialVariables: Record<string, string>;
}

/**
 * Represents the entire pre-processed table data for the VLM view.
 * This is the primary data structure the UI will consume from the store.
 */
export interface VLMTableData {
	columns: string[];
	rows: VLMTableRow[];
	stratificationColumns: Set<string>;
  }
  
  /**
   * Represents a single row in the VLM table.
   */
  export interface VLMTableRow {
	rowKey: string;
	PARAMCD: string;
	PARAM: string;
	[variableName: string]: ItemRef | string | null;
  }
  
  // You might also have an EnhancedVLMTableData, ensure it extends correctly
  export interface EnhancedVLMTableData extends VLMTableData {
	hierarchy?: any; // Use 'any' for now to prevent other errors
  }

  /**
 * Represents a Method in Define-XML for VLM processing
 * Extended from Method interface with additional VLM-specific properties
 */
export interface VLMMethod {
	OID: string | null;
	Name: string | null;
	Type: string | null;
	Description: string | null;
	Document?: string | null;
	Pages?: string | null;
	TranslatedText?: string | null;
	
	// VLM-specific properties
	hasSecondaryConditions?: boolean;
	secondaryConditionsText?: string;
}

// Alternative: Create a type alias that extends Method
export type VLMMethodAlt = Method & {
	hasSecondaryConditions?: boolean;
	secondaryConditionsText?: string;
}