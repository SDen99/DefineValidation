<script lang="ts">
	/**
	 * ChartFilterRow - Container for column chart filters
	 *
	 * Renders a row of mini-charts above the table header.
	 * Each chart visualizes the distribution of data in its column.
	 *
	 * Design: Decoupled - receives all data via props, emits filter changes via callbacks.
	 */

	import { untrack } from 'svelte';
	import {
		resolveAllColumnMetadata,
		calculateDistribution,
		type ColumnMetadata,
		type Distribution,
		type CategoricalDistribution,
		type NumericalDistribution,
		type DateDistribution,
		type DefineVariable,
		type DatasetDetails,
		type DistributionOptions
	} from '../../chart-filters';

	import type { ColumnConfig } from '../../types/columns';
	import type { Filter, SetFilter, NumericFilter, DateFilter } from '../../types/filters';
	import type { ChartDisplayMode } from './NumericalChart.svelte';

	import ColumnChart from './ColumnChart.svelte';

	// ============================================================================
	// Helper: Deep merge distribution options (preserves nested properties)
	// ============================================================================

	function mergeDistributionOptions(
		base: DistributionOptions,
		override: DistributionOptions | undefined
	): DistributionOptions {
		if (!override) return base;

		return {
			categorical: { ...base.categorical, ...override.categorical },
			numerical: { ...base.numerical, ...override.numerical },
			date: { ...base.date, ...override.date }
		};
	}

	// ============================================================================
	// Helper: Extract fixed bins/values from a distribution for alignment
	// ============================================================================

	function getFixedOptionsFromDistribution(
		dist: Distribution | undefined
	): DistributionOptions | undefined {
		if (!dist) return undefined;

		if (dist.type === 'categorical') {
			const catDist = dist as CategoricalDistribution;
			return {
				categorical: {
					fixedValues: catDist.allItems.map((item) => item.value)
				}
			};
		}

		if (dist.type === 'numerical') {
			const numDist = dist as NumericalDistribution;
			if (numDist.bins.length > 0) {
				// Extract bin edges: [x0 of first bin, x0 of second, ..., x1 of last bin]
				const edges = numDist.bins.map((b) => b.x0);
				edges.push(numDist.bins[numDist.bins.length - 1].x1);
				return {
					numerical: {
						fixedBinEdges: edges
					}
				};
			}
		}

		if (dist.type === 'date') {
			const dateDist = dist as DateDistribution;
			if (dateDist.bins.length > 0) {
				return {
					date: {
						fixedDateBins: dateDist.bins.map((b) => b.date),
						granularity: dateDist.granularity
					}
				};
			}
		}

		return undefined;
	}

	// ============================================================================
	// Props Interface (Decoupled Design)
	// ============================================================================

	interface Props {
		// Data
		data: Record<string, unknown>[];
		columns: ColumnConfig[];
		columnWidths: Record<string, number>;

		// Cross-filtering: filtered data for columns without their own filter
		crossFilterData?: Record<string, unknown>[];

		// Metadata (optional - for Define-XML integration)
		defineVariables?: DefineVariable[];
		datasetDetails?: DatasetDetails;

		// Filter state
		activeFilters?: Map<string, Filter>;

		// Configuration
		height?: number;
		visible?: boolean;
		showAllCodelistValues?: boolean;
		labelFormat?: 'code' | 'decode' | 'both';

		// Chart display modes per column (for numerical charts)
		chartDisplayModes?: Map<string, ChartDisplayMode>;

		// Callbacks
		onFilterChange?: (columnId: string, filter: Filter | null) => void;

		// Expose distribution types to parent (for showing chart mode toggle)
		onDistributionTypesChange?: (types: Map<string, 'categorical' | 'numerical' | 'date'>) => void;
	}

	let {
		data,
		columns,
		columnWidths,
		crossFilterData,
		defineVariables,
		datasetDetails,
		activeFilters = new Map(),
		height = 70,
		visible = true,
		showAllCodelistValues = false,
		labelFormat = 'code',
		chartDisplayModes = new Map(),
		onFilterChange,
		onDistributionTypesChange
	}: Props = $props();

	// ============================================================================
	// Derived State
	// ============================================================================

	// Visible columns only
	const visibleColumns = $derived(columns.filter((c) => c.visible));

	// Column metadata (resolved from Define-XML or pandas)
	const columnMetadata = $derived.by(() => {
		const columnIds = visibleColumns.map((c) => c.id);
		return resolveAllColumnMetadata(columnIds, defineVariables, datasetDetails);
	});

	// Distribution options
	const baseDistributionOptions: DistributionOptions = $derived({
		categorical: {
			maxItems: 5,
			showAllCodelistValues,
			includeNulls: true
		}
	});

	// Check if cross-filtering is active (filters exist and data has changed)
	const hasCrossFiltering = $derived(
		crossFilterData !== undefined &&
		crossFilterData !== data &&
		activeFilters.size > 0
	);

	// All distributions computed in a single deferred callback to avoid
	// double-trigger (originalDistributions update re-triggering distributions)
	let originalDistributions = $state.raw(new Map<string, Distribution>());
	let distributions = $state.raw(new Map<string, Distribution>());
	let ghostDistributions = $state.raw(new Map<string, Distribution>());

	$effect(() => {
		// Track all reactive dependencies upfront
		const currentData = data;
		const currentCrossFilterData = crossFilterData;
		const currentMetadata = columnMetadata;
		const currentOptions = baseDistributionOptions;
		const isCrossFiltering = hasCrossFiltering;

		if (currentData.length === 0) {
			originalDistributions = new Map<string, Distribution>();
			distributions = new Map<string, Distribution>();
			ghostDistributions = new Map<string, Distribution>();
			return;
		}

		// Defer all heavy computation to after paint
		const frameId = requestAnimationFrame(() => {
			// Step 1: Compute original distributions (from full/raw data)
			const t0 = performance.now();
			const origResult = new Map<string, Distribution>();

			for (const [columnId, metadata] of currentMetadata) {
				const distribution = calculateDistribution(currentData, columnId, metadata, currentOptions);
				if (distribution) {
					origResult.set(columnId, distribution);
				}
			}

			const t1 = performance.now();

			// Step 2: Compute filtered distributions (or reuse original)
			let filtResult: Map<string, Distribution>;

			if (!isCrossFiltering) {
				filtResult = origResult;
			} else {
				filtResult = new Map<string, Distribution>();
				const effectiveData = currentCrossFilterData ?? currentData;

				for (const [columnId, metadata] of currentMetadata) {
					const originalDist = origResult.get(columnId);
					const fixedOptions = getFixedOptionsFromDistribution(originalDist);
					const mergedOptions = mergeDistributionOptions(currentOptions, fixedOptions);

					const distribution = calculateDistribution(
						effectiveData,
						columnId,
						metadata,
						mergedOptions
					);
					if (distribution) {
						filtResult.set(columnId, distribution);
					}
				}
			}

			const t2 = performance.now();

			// Step 3: Compute ghost distributions
			let ghostResult = new Map<string, Distribution>();
			if (isCrossFiltering) {
				for (const [columnId] of currentMetadata) {
					const original = origResult.get(columnId);
					if (original) {
						ghostResult.set(columnId, original);
					}
				}
			}

			console.log(`[ChartFilterRow] ⏱️ distributions: original=${(t1-t0).toFixed(1)}ms, filtered=${(t2-t1).toFixed(1)}ms, total=${(t2-t0).toFixed(1)}ms (${currentData.length} rows × ${currentMetadata.size} cols${isCrossFiltering ? ', cross-filtering' : ''})`);

			// Batch all state updates together
			originalDistributions = origResult;
			distributions = filtResult;
			ghostDistributions = ghostResult;
		});

		return () => cancelAnimationFrame(frameId);
	});

	// Distribution types derived from the distributions map
	const distributionTypes = $derived.by(() => {
		const types = new Map<string, 'categorical' | 'numerical' | 'date'>();
		for (const [columnId, dist] of distributions) {
			types.set(columnId, dist.type);
		}
		return types;
	});

	// Notify parent when distribution types change
	$effect(() => {
		if (onDistributionTypesChange && distributionTypes.size > 0) {
			onDistributionTypesChange(distributionTypes);
		}
	});

	// ============================================================================
	// Event Handlers
	// ============================================================================

	function handleChartFilterChange(columnId: string, filter: Filter | null) {
		onFilterChange?.(columnId, filter);
	}
</script>

{#if visible}
	<tr class="chart-filter-row" style="height: {height}px;">
		{#each visibleColumns as column (column.id)}
			{@const width = columnWidths[column.id] || column.width || 150}
			{@const metadata = columnMetadata.get(column.id)}
			{@const distribution = distributions.get(column.id)}
			{@const ghostDistribution = ghostDistributions.get(column.id)}
			{@const activeFilter = activeFilters.get(column.id)}
			{@const displayMode = chartDisplayModes.get(column.id) ?? 'bar'}

			<th
				class="chart-cell"
				style="width: {width}px; min-width: {width}px; max-width: {width}px; height: {height}px;"
			>
				{#if distribution && metadata}
					<ColumnChart
						{distribution}
						{ghostDistribution}
						{metadata}
						{width}
						{height}
						{labelFormat}
						{displayMode}
						filter={activeFilter}
						onFilterChange={(filter) => handleChartFilterChange(column.id, filter)}
					/>
				{:else}
					<div class="chart-placeholder">
						<span class="placeholder-text">--</span>
					</div>
				{/if}
			</th>
		{/each}
	</tr>
{/if}

<style>
	.chart-filter-row {
		background: var(--color-muted, #f4f4f5);
	}

	.chart-cell {
		padding: 2px;
		border: 1px solid var(--color-border, #e4e4e7);
		vertical-align: top;
		overflow: hidden;
	}

	.chart-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--color-muted-foreground, #71717a);
		font-size: 12px;
	}

	.placeholder-text {
		opacity: 0.5;
	}
</style>
