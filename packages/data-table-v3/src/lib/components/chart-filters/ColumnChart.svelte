<script lang="ts">
	/**
	 * ColumnChart - Renders appropriate chart based on distribution type
	 *
	 * Delegates to specialized chart components:
	 * - CategoricalChart: Bar chart for categorical data
	 * - NumericalChart: Histogram with brush for numerical data
	 * - DateChart: Timeline with brush for date data
	 */

	import type {
		Distribution,
		CategoricalDistribution,
		NumericalDistribution,
		DateDistribution,
		ColumnMetadata
	} from '../../chart-filters';

	import type { Filter } from '../../types/filters';
	import type { ChartDisplayMode } from './NumericalChart.svelte';

	import CategoricalChart from './CategoricalChart.svelte';
	import NumericalChart from './NumericalChart.svelte';
	import DateChart from './DateChart.svelte';

	// ============================================================================
	// Props
	// ============================================================================

	interface Props {
		distribution: Distribution;
		ghostDistribution?: Distribution; // Original distribution for ghost overlay
		metadata: ColumnMetadata;
		width: number;
		height: number;
		labelFormat?: 'code' | 'decode' | 'both';
		filter?: Filter;
		onFilterChange?: (filter: Filter | null) => void;
		displayMode?: ChartDisplayMode; // For numerical charts: bar, line-smooth, line-linear
	}

	let {
		distribution,
		ghostDistribution,
		metadata,
		width,
		height,
		labelFormat = 'code',
		filter,
		onFilterChange,
		displayMode = 'bar'
	}: Props = $props();

	// ============================================================================
	// Type Guards
	// ============================================================================

	function isCategorical(d: Distribution): d is CategoricalDistribution {
		return d.type === 'categorical';
	}

	function isNumerical(d: Distribution): d is NumericalDistribution {
		return d.type === 'numerical';
	}

	function isDate(d: Distribution): d is DateDistribution {
		return d.type === 'date';
	}
</script>

<div class="column-chart" style="width: {width - 4}px; height: {height - 4}px;">
	{#if isCategorical(distribution)}
		<CategoricalChart
			{distribution}
			ghostDistribution={ghostDistribution && isCategorical(ghostDistribution) ? ghostDistribution : undefined}
			{metadata}
			width={width - 4}
			height={height - 4}
			{labelFormat}
			{filter}
			{onFilterChange}
		/>
	{:else if isNumerical(distribution)}
		<NumericalChart
			{distribution}
			ghostDistribution={ghostDistribution && isNumerical(ghostDistribution) ? ghostDistribution : undefined}
			width={width - 4}
			height={height - 4}
			{filter}
			{onFilterChange}
			{displayMode}
		/>
	{:else if isDate(distribution)}
		<DateChart
			{distribution}
			ghostDistribution={ghostDistribution && isDate(ghostDistribution) ? ghostDistribution : undefined}
			width={width - 4}
			height={height - 4}
			{filter}
			{onFilterChange}
		/>
	{:else}
		<div class="unsupported">
			<span>?</span>
		</div>
	{/if}
</div>

<style>
	.column-chart {
		position: relative;
		overflow: hidden;
	}

	.unsupported {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--color-muted-foreground, #71717a);
		font-size: 14px;
		opacity: 0.5;
	}
</style>
