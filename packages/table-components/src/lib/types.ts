// Shared table column interface
export interface TableColumn {
	id: string;
	label: string;
	width?: number;
	visible?: boolean;
	resizable?: boolean;
	sortable?: boolean;
}

// Sort configuration interface
export interface SortConfig {
	column: string;
	direction: 'asc' | 'desc';
}

// Base table header event handlers
export interface BaseTableHeaderEvents {
	onColumnReorder: (from: string, to: string) => void;
	onColumnResize: (column: string, width: number) => void;
}

// Extended events for specialized table headers
export interface DataTableHeaderEvents extends BaseTableHeaderEvents {
	onSort: (column: string, isMultiSort?: boolean) => void;
}