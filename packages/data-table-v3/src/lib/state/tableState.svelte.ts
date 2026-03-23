/**
 * Table State Management Module
 *
 * Encapsulates all state and engine logic for ClinicalDataTableV3.
 * Uses Svelte 5 runes for reactivity.
 */

import { untrack } from 'svelte';
import { filterData } from '../engines/filterData';
import { sortData } from '../engines/sortData';
import { VirtualizationEngine } from '../engines/VirtualizationEngine';
import { serializeFilters, deserializeFilters } from '../utils/filterSerialization';

import type { DataRow } from '../types/core';
import type { ColumnConfig } from '../types/columns';
import type { Filter, FilterCombination, SerializedFilter, GlobalFilter } from '../types/filters';
import type { SortConfig } from '../types/sorting';
import type { VisibleWindow, ViewportConfig } from '../types/virtualization';
import type { ChartDisplayMode } from '../components/chart-filters/NumericalChart.svelte';

// ============================================================
// TYPES
// ============================================================

export interface TableStateOptions {
	enableCdiscPriority?: boolean;
	rowHeight?: number;
	overscan?: number;
	containerHeight?: number;

	// Initial state from props (for persistence)
	initialFilters?: SerializedFilter[];
	initialSort?: SortConfig[];
	initialColumnWidths?: Record<string, number>;
	initialVisibleColumns?: string[];
	initialColumnOrder?: string[];

	// Callbacks
	onMetricStart?: (metric: string) => void;
	onMetricEnd?: (metric: string) => void;
	onFilterChange?: (filters: SerializedFilter[]) => void;
	onSortChange?: (sorts: SortConfig[]) => void;
	onColumnWidthChange?: (widths: Record<string, number>) => void;
	onVisibilityChange?: (visibleColumns: string[]) => void;
	onColumnOrderChange?: (columnOrder: string[]) => void;
}

export interface ClinicalDataState {
	getSelectedDatasetId: () => string | null;
	getDatasets: () => Record<string, any>;
}

// ============================================================
// STATE FACTORY
// ============================================================

export function createTableState(options: TableStateOptions) {
	// ============================================================
	// ENGINES
	// ============================================================

	const sortOptions = {
		clinicalMode: options.enableCdiscPriority ?? false,
		stable: true
	};

	let virtualizationEngine: VirtualizationEngine | undefined;
	let unsubscribeFns: (() => void)[] = [];

	// Debounce timer for filter changes
	let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	const FILTER_DEBOUNCE_MS = 100;

	// ============================================================
	// STATE (Reactive with Svelte 5 Runes)
	// ============================================================

	let rawData = $state.raw<DataRow[]>([]);
	let processedData = $state.raw<DataRow[]>([]);
	let columns = $state<ColumnConfig[]>([]);
	let filters = $state<Map<string, Filter>>(new Map());
	let filterCombination = $state<FilterCombination>('AND');
	let sortConfigs = $state<SortConfig[]>([]);

	// Track initialization to avoid emitting events during state restoration
	let isInitializing = $state(false);

	// Per-dataset filter and sort storage
	let filtersByDataset = $state<Map<string, Map<string, Filter>>>(new Map());
	let sortsByDataset = $state<Map<string, SortConfig[]>>(new Map());
	let columnWidthsByDataset = $state<Map<string, Record<string, number>>>(new Map());
	let visibilityByDataset = $state<Map<string, string[]>>(new Map());
	let orderByDataset = $state<Map<string, string[]>>(new Map());

	// Current column widths
	let currentColumnWidths = $state<Record<string, number>>({});

	// Chart display modes per column (for numerical charts)
	let chartDisplayModes = $state<Map<string, ChartDisplayMode>>(new Map());

	// Distribution types per column (from ChartFilterRow)
	let distributionTypes = $state<Map<string, 'categorical' | 'numerical' | 'date'>>(new Map());

	// Drag and drop state for column reordering
	let draggedColumnId = $state<string | null>(null);
	let dragOverColumnId = $state<string | null>(null);

	// Virtualization state
	let visibleWindow = $state<VisibleWindow>({
		startIndex: 0,
		endIndex: 0,
		visibleCount: 0,
		offsetY: 0
	});

	// Current dataset ID
	let currentDatasetId = $state<string | null>(null);
	let lastDatasetId = $state<string | null>(null);

	// Configuration
	let rowHeight = $state(options.rowHeight ?? 32);
	let overscan = $state(options.overscan ?? 5);
	let containerHeight = $state(options.containerHeight ?? 600);

	// ============================================================
	// DERIVED STATE
	// ============================================================

	const visibleRows = $derived(processedData.slice(visibleWindow.startIndex, visibleWindow.endIndex));
	const totalHeight = $derived(processedData.length * rowHeight);
	const visibleColumns = $derived(columns.filter((c) => c.visible));
	const totalWidth = $derived(
		visibleColumns.reduce((sum, col) => sum + (currentColumnWidths[col.id] || col.width || 150), 0)
	);

	// ============================================================
	// DATA LOADING
	// ============================================================

	function isISODateString(value: unknown): boolean {
		if (typeof value !== 'string') return false;

		const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
		const isoDateTimePattern =
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/;

		if (!isoDatePattern.test(value) && !isoDateTimePattern.test(value)) {
			return false;
		}

		const parsed = new Date(value);
		return !isNaN(parsed.getTime());
	}

	function loadDataFromState(dataState: ClinicalDataState, datasetId: string) {
		const t0 = performance.now();
		const datasets = dataState.getDatasets();
		const dataset = datasets[datasetId];

		if (dataset && dataset.data) {
			rawData = dataset.data;
			const t1 = performance.now();

			// Infer columns from first few rows (up to 10) to handle null values
			if (rawData.length > 0) {
				const firstRow = rawData[0];
				const sampleSize = Math.min(10, rawData.length);

				columns = Object.keys(firstRow).map((key, index) => {
					let dataType: 'string' | 'number' | 'date' | 'boolean' = 'string';

					for (let i = 0; i < sampleSize; i++) {
						const value = rawData[i][key];

						if (value === null || value === undefined) {
							continue;
						}

						if (typeof value === 'number') {
							dataType = 'number';
							break;
						} else if (typeof value === 'boolean') {
							dataType = 'boolean';
							break;
						} else if (value instanceof Date) {
							dataType = 'date';
							break;
						} else if (isISODateString(value)) {
							dataType = 'date';
							break;
						}
					}

					return {
						id: key,
						header: key,
						dataType,
						visible: true,
						width: 150,
						filterable: true,
						sortable: true,
						resizable: true,
						order: index
					};
				});
			}
			const t2 = performance.now();

			// Process initial data
			untrack(() => {
				processData();
			});
			const t3 = performance.now();
			console.log(`[tableState] ⏱️ loadDataFromState(${datasetId}): data=${(t1-t0).toFixed(1)}ms, columns=${(t2-t1).toFixed(1)}ms, processData=${(t3-t2).toFixed(1)}ms, total=${(t3-t0).toFixed(1)}ms (${rawData.length} rows)`);
		}
	}

	// ============================================================
	// DATA PROCESSING
	// ============================================================

	function processData() {
		options.onMetricStart?.('filter');

		// Step 1: Apply Filtering
		const activeFilters = Array.from(filters.values()).filter((f) => f.enabled ?? true);
		const filteredResult = filterData(rawData, activeFilters, { combination: filterCombination });

		options.onMetricEnd?.('filter');
		options.onMetricStart?.('sort');

		// Step 2: Apply Sorting
		const sortedResult = sortData(filteredResult, sortConfigs, sortOptions);

		options.onMetricEnd?.('sort');

		// Step 3: Update state
		processedData = sortedResult;

		// Update virtualization
		updateVirtualization();
	}

	// ============================================================
	// VIRTUALIZATION
	// ============================================================

	function updateVirtualization() {
		if (virtualizationEngine) {
			virtualizationEngine.setTotalRows(processedData.length);

			const scrollState = virtualizationEngine.getScrollState();
			const maxValidScroll = Math.max(0, processedData.length * rowHeight - containerHeight);

			if (scrollState.scrollTop > maxValidScroll) {
				virtualizationEngine.scrollToTop();
			}

			visibleWindow = virtualizationEngine.getVisibleWindow();
		}
	}

	function initializeVirtualization() {
		const config: ViewportConfig = {
			height: containerHeight,
			rowHeight,
			overscan
		};

		virtualizationEngine = new VirtualizationEngine(config);
		virtualizationEngine.setTotalRows(processedData.length);
		visibleWindow = virtualizationEngine.getVisibleWindow();

		unsubscribeFns.push(
			virtualizationEngine.on('window-changed', ({ window: newWindow }) => {
				visibleWindow = newWindow;
			})
		);
	}

	function handleScroll(scrollTop: number) {
		if (!virtualizationEngine) return;
		virtualizationEngine.onScroll(scrollTop);
	}

	function updateVirtualizationConfig(config: Partial<ViewportConfig>) {
		if (config.height !== undefined) containerHeight = config.height;
		if (config.rowHeight !== undefined) rowHeight = config.rowHeight;
		if (config.overscan !== undefined) overscan = config.overscan;

		if (virtualizationEngine) {
			virtualizationEngine.updateConfig({
				height: containerHeight,
				rowHeight,
				overscan
			});
			visibleWindow = virtualizationEngine.getVisibleWindow();
		}
	}

	// ============================================================
	// FILTER HANDLERS
	// ============================================================

	function handleFilterChange(columnId: string, filter: Filter | null) {
		if (filter) {
			filters.set(columnId, filter);
		} else {
			filters.delete(columnId);
		}
		filters = new Map(filters);

		if (currentDatasetId) {
			filtersByDataset.set(currentDatasetId, new Map(filters));
		}

		// Debounce processData to avoid excessive recalculation during rapid filter changes
		if (filterDebounceTimer) {
			clearTimeout(filterDebounceTimer);
		}
		filterDebounceTimer = setTimeout(() => {
			processData();
			filterDebounceTimer = null;

			// Fire callback after processing so consumers see the updated state
			if (options.onFilterChange && !isInitializing) {
				const filterArray = Array.from(filters.values());
				const serializedFilters = serializeFilters(filterArray);
				options.onFilterChange(serializedFilters);
			}
		}, FILTER_DEBOUNCE_MS);
	}

	function handleFilterCombinationChange(combination: FilterCombination) {
		filterCombination = combination;
		if (filters.size > 0) {
			processData();
		}
	}

	function handleClearAllFilters() {
		filters.clear();
		filters = new Map(filters);

		if (currentDatasetId) {
			filtersByDataset.set(currentDatasetId, new Map(filters));
		}

		processData();

		if (options.onFilterChange && !isInitializing) {
			options.onFilterChange([]);
		}
	}

	// ============================================================
	// SORT HANDLERS
	// ============================================================

	function handleColumnHeaderClick(columnId: string) {
		const existingIndex = sortConfigs.findIndex((c) => c.columnId === columnId);

		if (existingIndex === -1) {
			// Not sorted - add ascending
			sortConfigs = [...sortConfigs, { columnId, direction: 'asc' }];
		} else if (sortConfigs[existingIndex].direction === 'asc') {
			// Currently ascending - change to descending
			sortConfigs = sortConfigs.map((c, i) =>
				i === existingIndex ? { ...c, direction: 'desc' as const } : c
			);
		} else {
			// Currently descending - remove sort
			sortConfigs = sortConfigs.filter((_, i) => i !== existingIndex);
		}

		if (currentDatasetId) {
			sortsByDataset.set(currentDatasetId, [...sortConfigs]);
		}

		processData();

		if (options.onSortChange && !isInitializing) {
			options.onSortChange([...sortConfigs]);
		}
	}

	function getSortDirection(columnId: string): 'asc' | 'desc' | null {
		const sortConfig = sortConfigs.find((s) => s.columnId === columnId);
		return sortConfig ? sortConfig.direction : null;
	}

	function getSortPriority(columnId: string): number | null {
		const index = sortConfigs.findIndex((s) => s.columnId === columnId);
		return index >= 0 ? index + 1 : null;
	}

	// ============================================================
	// COLUMN WIDTH HANDLERS
	// ============================================================

	function handleColumnResize(columnId: string, newWidth: number) {
		const clampedWidth = Math.max(50, newWidth);

		currentColumnWidths = {
			...currentColumnWidths,
			[columnId]: clampedWidth
		};

		if (currentDatasetId) {
			columnWidthsByDataset.set(currentDatasetId, { ...currentColumnWidths });
		}

		if (options.onColumnWidthChange && !isInitializing) {
			options.onColumnWidthChange({ ...currentColumnWidths });
		}
	}

	// ============================================================
	// CHART MODE HANDLERS
	// ============================================================

	function handleChartModeChange(columnId: string, mode: ChartDisplayMode) {
		chartDisplayModes.set(columnId, mode);
		chartDisplayModes = new Map(chartDisplayModes);
	}

	function handleDistributionTypesChange(types: Map<string, 'categorical' | 'numerical' | 'date'>) {
		distributionTypes = types;
	}

	// ============================================================
	// COLUMN DRAG AND DROP
	// ============================================================

	function handleDragStart(columnId: string) {
		draggedColumnId = columnId;
	}

	function handleDragOver(columnId: string) {
		if (draggedColumnId && draggedColumnId !== columnId) {
			dragOverColumnId = columnId;
		}
	}

	function handleDragLeave() {
		dragOverColumnId = null;
	}

	function handleDrop(targetColumnId: string) {
		if (draggedColumnId && draggedColumnId !== targetColumnId) {
			const draggedIndex = columns.findIndex((c) => c.id === draggedColumnId);
			const targetIndex = columns.findIndex((c) => c.id === targetColumnId);

			if (draggedIndex !== -1 && targetIndex !== -1) {
				const [draggedColumn] = columns.splice(draggedIndex, 1);
				columns.splice(targetIndex, 0, draggedColumn);
				columns = [...columns];
				emitColumnOrderChange();
			}
		}
		draggedColumnId = null;
		dragOverColumnId = null;
	}

	function handleDragEnd() {
		draggedColumnId = null;
		dragOverColumnId = null;
	}

	// ============================================================
	// COLUMN VISIBILITY (Public API)
	// ============================================================

	function emitVisibilityChange(): void {
		if (options.onVisibilityChange && !isInitializing) {
			const visibleIds = columns.filter((c) => c.visible).map((c) => c.id);
			if (currentDatasetId) {
				visibilityByDataset.set(currentDatasetId, visibleIds);
			}
			options.onVisibilityChange(visibleIds);
		}
	}

	function emitColumnOrderChange(): void {
		if (options.onColumnOrderChange && !isInitializing) {
			const order = columns.map((c) => c.id);
			if (currentDatasetId) {
				orderByDataset.set(currentDatasetId, order);
			}
			options.onColumnOrderChange(order);
		}
	}

	function getAvailableColumns(): string[] {
		return columns.map((c) => c.id);
	}

	function getVisibleColumnIds(): string[] {
		return columns.filter((c) => c.visible).map((c) => c.id);
	}

	function toggleColumnVisibility(columnId: string): void {
		const colIndex = columns.findIndex((c) => c.id === columnId);
		if (colIndex !== -1) {
			columns[colIndex].visible = !columns[colIndex].visible;
			columns = [...columns];
			emitVisibilityChange();
		}
	}

	function showAllColumns(): void {
		columns = columns.map((c) => ({ ...c, visible: true }));
		emitVisibilityChange();
	}

	function hideAllColumns(): void {
		columns = columns.map((c, i) => ({ ...c, visible: i === 0 }));
		emitVisibilityChange();
	}

	function resetColumns(): void {
		columns = columns.map((c) => ({ ...c, visible: true }));
		emitVisibilityChange();
	}

	function reorderColumns(draggedId: string, targetId: string): void {
		const draggedIndex = columns.findIndex((c) => c.id === draggedId);
		const targetIndex = columns.findIndex((c) => c.id === targetId);

		if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
			const [draggedColumn] = columns.splice(draggedIndex, 1);
			columns.splice(targetIndex, 0, draggedColumn);
			columns = [...columns];
			emitColumnOrderChange();
		}
	}

	// ============================================================
	// INITIALIZATION
	// ============================================================

	function initializeDataset(dataState: ClinicalDataState, datasetId: string) {
		if (datasetId === lastDatasetId) return;
		const tInit = performance.now();

		lastDatasetId = datasetId;
		currentDatasetId = datasetId;

		untrack(() => {
			isInitializing = true;

			// Restore filters from props or per-dataset storage
			if (options.initialFilters && !filtersByDataset.has(datasetId)) {
				const deserializedFilters = deserializeFilters(options.initialFilters);
				filters = new Map(
					deserializedFilters
						.filter((f): f is Exclude<Filter, GlobalFilter> => f.type !== 'global')
						.map((f) => [f.columnId, f] as const)
				);
			} else {
				const savedFilters = filtersByDataset.get(datasetId);
				if (savedFilters) {
					filters = new Map(savedFilters);
				} else {
					filters.clear();
					filters = new Map(filters);
				}
			}

			// Restore sorts from props or per-dataset storage
			if (options.initialSort && !sortsByDataset.has(datasetId)) {
				sortConfigs = [...options.initialSort];
			} else {
				const savedSorts = sortsByDataset.get(datasetId);
				if (savedSorts) {
					sortConfigs = [...savedSorts];
				} else {
					sortConfigs = [];
				}
			}

			// Restore column widths from props or per-dataset storage
			if (options.initialColumnWidths && !columnWidthsByDataset.has(datasetId)) {
				currentColumnWidths = { ...options.initialColumnWidths };
			} else {
				const savedWidths = columnWidthsByDataset.get(datasetId);
				currentColumnWidths = savedWidths ? { ...savedWidths } : {};
			}

			loadDataFromState(dataState, datasetId);

			// Apply initial column visibility (after data is loaded so columns exist)
			if (options.initialVisibleColumns && !visibilityByDataset.has(datasetId)) {
				const visibleSet = new Set(options.initialVisibleColumns);
				columns = columns.map((c) => ({
					...c,
					visible: visibleSet.has(c.id)
				}));
			} else {
				const savedVisibility = visibilityByDataset.get(datasetId);
				if (savedVisibility) {
					const visibleSet = new Set(savedVisibility);
					columns = columns.map((c) => ({
						...c,
						visible: visibleSet.has(c.id)
					}));
				}
			}

			// Apply initial column order (after data is loaded so columns exist)
			if (options.initialColumnOrder && !orderByDataset.has(datasetId)) {
				const orderMap = new Map(options.initialColumnOrder.map((id, idx) => [id, idx]));
				columns = [...columns].sort((a, b) => {
					const aOrder = orderMap.get(a.id) ?? Infinity;
					const bOrder = orderMap.get(b.id) ?? Infinity;
					return aOrder - bOrder;
				});
			} else {
				const savedOrder = orderByDataset.get(datasetId);
				if (savedOrder) {
					const orderMap = new Map(savedOrder.map((id, idx) => [id, idx]));
					columns = [...columns].sort((a, b) => {
						const aOrder = orderMap.get(a.id) ?? Infinity;
						const bOrder = orderMap.get(b.id) ?? Infinity;
						return aOrder - bOrder;
					});
				}
			}

			isInitializing = false;
		});
		console.log(`[tableState] ⏱️ initializeDataset(${datasetId}): total=${(performance.now()-tInit).toFixed(1)}ms`);
	}

	// ============================================================
	// LIFECYCLE
	// ============================================================

	function mount() {
		initializeVirtualization();
	}

	function destroy() {
		unsubscribeFns.forEach((unsubscribe) => unsubscribe());
		unsubscribeFns = [];
		// Clean up debounce timer
		if (filterDebounceTimer) {
			clearTimeout(filterDebounceTimer);
			filterDebounceTimer = null;
		}
	}

	// ============================================================
	// RETURN PUBLIC API
	// ============================================================

	return {
		// State getters (reactive)
		get rawData() {
			return rawData;
		},
		get processedData() {
			return processedData;
		},
		get columns() {
			return columns;
		},
		get filters() {
			return filters;
		},
		get filterCombination() {
			return filterCombination;
		},
		get sortConfigs() {
			return sortConfigs;
		},
		get visibleWindow() {
			return visibleWindow;
		},
		get visibleRows() {
			return visibleRows;
		},
		get visibleColumns() {
			return visibleColumns;
		},
		get totalHeight() {
			return totalHeight;
		},
		get totalWidth() {
			return totalWidth;
		},
		get currentColumnWidths() {
			return currentColumnWidths;
		},
		get chartDisplayModes() {
			return chartDisplayModes;
		},
		get distributionTypes() {
			return distributionTypes;
		},
		get draggedColumnId() {
			return draggedColumnId;
		},
		get dragOverColumnId() {
			return dragOverColumnId;
		},
		get rowHeight() {
			return rowHeight;
		},
		get containerHeight() {
			return containerHeight;
		},

		// Filter actions
		handleFilterChange,
		handleFilterCombinationChange,
		handleClearAllFilters,

		// Sort actions
		handleColumnHeaderClick,
		getSortDirection,
		getSortPriority,

		// Column width actions
		handleColumnResize,

		// Chart mode actions
		handleChartModeChange,
		handleDistributionTypesChange,

		// Drag and drop actions
		handleDragStart,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		handleDragEnd,

		// Column visibility (public API for sidebar)
		getAvailableColumns,
		getVisibleColumnIds,
		toggleColumnVisibility,
		showAllColumns,
		hideAllColumns,
		resetColumns,
		reorderColumns,

		// Virtualization
		handleScroll,
		updateVirtualizationConfig,

		// Initialization
		initializeDataset,

		// Lifecycle
		mount,
		destroy
	};
}

export type TableState = ReturnType<typeof createTableState>;
