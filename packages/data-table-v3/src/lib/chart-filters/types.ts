/**
 * Type definitions for chart filter distribution calculations
 */

// ============================================================================
// Column Type Classification
// ============================================================================

export type ColumnType = 'categorical' | 'numerical' | 'date' | 'unknown';

// ============================================================================
// Codelist Types
// ============================================================================

export interface CodelistItem {
	codedValue: string;
	decode: string;
}

// ============================================================================
// Column Metadata
// ============================================================================

export interface ColumnMetadata {
	columnId: string;
	type: ColumnType;
	codelist?: CodelistItem[];
	source: 'define-xml' | 'pandas' | 'inferred';
}

// ============================================================================
// Categorical Distribution
// ============================================================================

export interface CategoricalDistribution {
	type: 'categorical';
	columnId: string;
	items: CategoricalItem[]; // Top N items for chart display
	allItems: CategoricalItem[]; // All items for popover
	totalCount: number;
	nullCount: number;
	hasMore: boolean; // True if truncated to top N
}

export interface CategoricalItem {
	value: string;
	decode?: string; // From codelist if available
	count: number;
	percentage: number;
}

export interface CategoricalOptions {
	maxItems?: number; // Top N items (default: 5)
	showAllCodelistValues?: boolean; // Show codelist values even if count is 0
	includeNulls?: boolean; // Include null/empty as a category
	fixedValues?: string[]; // Use these values in this order (for ghost overlay alignment)
}

// ============================================================================
// Numerical Distribution
// ============================================================================

export interface NumericalDistribution {
	type: 'numerical';
	columnId: string;
	bins: NumericalBin[];
	stats: NumericalStats;
	nullCount: number;
	isDiscrete: boolean; // True if data has low cardinality (e.g., 1, 2, 3)
}

export interface NumericalBin {
	x0: number; // Start (inclusive)
	x1: number; // End (exclusive)
	count: number;
	percentage: number;
}

export interface NumericalStats {
	min: number;
	max: number;
	mean: number;
	median: number;
	count: number;
}

export interface NumericalOptions {
	binCount?: number; // Number of bins (default: auto-calculate)
	minBins?: number; // Minimum bins (default: 5)
	maxBins?: number; // Maximum bins (default: 20)
	fixedBinEdges?: number[]; // Use these bin edges (for ghost overlay alignment)
}

// ============================================================================
// Date Distribution
// ============================================================================

export interface DateDistribution {
	type: 'date';
	columnId: string;
	bins: DateBin[];
	granularity: DateGranularity;
	nullCount: number;
}

export interface DateBin {
	date: Date;
	label: string;
	count: number;
	percentage: number;
}

export type DateGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface DateOptions {
	granularity?: DateGranularity; // Auto-detect if not specified
	fixedDateBins?: Date[]; // Use these date bins (for ghost overlay alignment)
}

// ============================================================================
// Combined Distribution Type
// ============================================================================

export type Distribution = CategoricalDistribution | NumericalDistribution | DateDistribution;

// ============================================================================
// Input Types for Define-XML Metadata
// ============================================================================

export interface DefineVariable {
	variable: {
		name: string;
		dataType: string;
		/** Maximum length from Define-XML ItemDef.Length */
		length?: number;
	};
	codeList?: {
		items: CodelistItem[];
	};
	/** Whether the variable is mandatory (from ItemRef.Mandatory) */
	mandatory?: boolean;
}

export interface DatasetDetails {
	dtypes?: Record<string, string>;
}

// ============================================================================
// Distribution Options
// ============================================================================

export interface DistributionOptions {
	categorical?: CategoricalOptions;
	numerical?: NumericalOptions;
	date?: DateOptions;
}
