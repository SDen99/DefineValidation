<script lang="ts">
	/**
	 * CategoricalChart - Horizontal bar chart for categorical data
	 */

	import type { CategoricalDistribution, CategoricalItem, ColumnMetadata } from '../../chart-filters';
	import type { Filter, SetFilter } from '../../types/filters';
	import { getChartColors } from './chartTheme';
	import ValuesPopover from './ValuesPopover.svelte';

	// ============================================================================
	// Props
	// ============================================================================

	interface Props {
		distribution: CategoricalDistribution;
		ghostDistribution?: CategoricalDistribution; // Original distribution for ghost overlay
		metadata: ColumnMetadata;
		width: number;
		height: number;
		labelFormat?: 'code' | 'decode' | 'both';
		filter?: Filter;
		onFilterChange?: (filter: Filter | null) => void;
	}

	let {
		distribution,
		ghostDistribution,
		metadata,
		width,
		height,
		labelFormat = 'code',
		filter,
		onFilterChange
	}: Props = $props();

	// ============================================================================
	// Configuration
	// ============================================================================

	const CONFIG = {
		padding: { top: 2, right: 4, bottom: 2, left: 4 },
		barHeight: 14,
		barGap: 2,
		textPadding: 4
	};

	// ============================================================================
	// State
	// ============================================================================

	let canvas: HTMLCanvasElement | undefined = $state(undefined);
	let hoveredIndex = $state<number | null>(null);
	let showPopover = $state(false);

	// Theme tracking - observe changes to accent color
	let themeKey = $state(0);

	$effect(() => {
		if (typeof document === 'undefined') return;

		const observer = new MutationObserver(() => {
			// Trigger re-render when class changes (theme/accent changes)
			themeKey++;
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		return () => observer.disconnect();
	});

	// ============================================================================
	// Derived State (all pure computations, no side effects)
	// ============================================================================

	const selectedValues = $derived.by(() => {
		if (!filter || filter.type !== 'set') return new Set<string>();
		return new Set((filter as SetFilter).values.map(String));
	});

	const hasSelection = $derived(selectedValues.size > 0);

	const chartWidth = $derived(width - CONFIG.padding.left - CONFIG.padding.right);
	const chartHeight = $derived(height - CONFIG.padding.top - CONFIG.padding.bottom);

	// Use ghost distribution's max for consistent scaling when ghost is shown
	const maxCount = $derived.by(() => {
		if (ghostDistribution) {
			return Math.max(...ghostDistribution.items.map((item) => item.count), 1);
		}
		return Math.max(...distribution.items.map((item) => item.count), 1);
	});

	// Create a map of ghost counts by value for quick lookup
	const ghostCountMap = $derived.by(() => {
		if (!ghostDistribution) return null;
		const map = new Map<string, number>();
		for (const item of ghostDistribution.items) {
			map.set(item.value, item.count);
		}
		return map;
	});

	const barLayout = $derived.by(() => {
		const items = distribution.items;
		const availableHeight = chartHeight;
		const totalBarsHeight = items.length * CONFIG.barHeight + (items.length - 1) * CONFIG.barGap;
		const startY = CONFIG.padding.top + Math.max(0, (availableHeight - totalBarsHeight) / 2);

		return items.map((item, index) => ({
			item,
			index,
			x: CONFIG.padding.left,
			y: startY + index * (CONFIG.barHeight + CONFIG.barGap),
			width: Math.max((item.count / maxCount) * chartWidth, 2),
			ghostWidth: ghostCountMap
				? Math.max((ghostCountMap.get(item.value) || 0) / maxCount * chartWidth, 2)
				: 0,
			height: CONFIG.barHeight
		}));
	});

	const tooltipText = $derived.by(() => {
		if (hoveredIndex === null) return null;
		const item = distribution.items[hoveredIndex];
		if (!item) return null;
		const label = item.decode ? `${item.value} (${item.decode})` : item.value;
		return `${label}: ${item.count} (${item.percentage.toFixed(1)}%)`;
	});


	// ============================================================================
	// Canvas Rendering - Single effect that handles everything
	// ============================================================================

	$effect(() => {
		// Access all reactive dependencies upfront
		const currentWidth = width;
		const currentHeight = height;
		const currentBarLayout = barLayout;
		const currentSelectedValues = selectedValues;
		const currentHasSelection = hasSelection;
		const currentHoveredIndex = hoveredIndex;
		const currentDistribution = distribution;
		const currentGhostDistribution = ghostDistribution;
		void themeKey; // Track theme changes

		// Early exit if no canvas
		if (!canvas) return;

		// Get fresh context and set up canvas dimensions
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Set canvas size (this resets all canvas state including transforms)
		const dpr = window.devicePixelRatio || 1;
		canvas.width = currentWidth * dpr;
		canvas.height = currentHeight * dpr;
		canvas.style.width = `${currentWidth}px`;
		canvas.style.height = `${currentHeight}px`;

		// Scale for HiDPI
		ctx.scale(dpr, dpr);

		// Get theme colors fresh for this render
		const colors = getChartColors();

		// Clear canvas (should already be clear from resize, but be safe)
		ctx.clearRect(0, 0, currentWidth, currentHeight);

		// Draw ghost bars first (if ghost distribution exists)
		if (currentGhostDistribution) {
			for (const bar of currentBarLayout) {
				if (bar.ghostWidth > 0) {
					ctx.fillStyle = colors.barGhost;
					ctx.fillRect(bar.x, bar.y, bar.ghostWidth, bar.height);
				}
			}
		}

		// Draw active bars
		for (const bar of currentBarLayout) {
			const isSelected = currentSelectedValues.has(bar.item.value);
			const isHovered = currentHoveredIndex === bar.index;

			// Determine color
			let color = colors.bar;
			if (currentHasSelection) {
				color = isSelected ? colors.barSelected : colors.barMuted;
			}
			if (isHovered) {
				color = colors.barHover;
			}

			ctx.fillStyle = color;
			ctx.fillRect(bar.x, bar.y, bar.width, bar.height);

			// Set up text rendering
			ctx.font = '9px system-ui, sans-serif';
			ctx.textBaseline = 'middle';

			// Get label and count
			const label = getLabel(bar.item);
			const countText = bar.item.count.toString();

			// Calculate available space for label
			const countWidth = ctx.measureText(countText).width;
			const labelX = CONFIG.padding.left + CONFIG.textPadding;
			const countX = currentWidth - CONFIG.padding.right - CONFIG.textPadding;
			const availableWidth = countX - labelX - countWidth - 8; // 8px gap

			// Truncate label if needed
			let displayLabel = label;
			const labelWidth = ctx.measureText(label).width;

			if (labelWidth > availableWidth && availableWidth > 10) {
				// Find how many chars fit
				const ellipsis = '…';
				let truncated = label;
				while (truncated.length > 1 && ctx.measureText(truncated + ellipsis).width > availableWidth) {
					truncated = truncated.slice(0, -1);
				}
				displayLabel = truncated.length < label.length ? truncated + ellipsis : label;
			}

			// Draw text
			ctx.fillStyle = currentHasSelection && !isSelected ? colors.textMuted : colors.text;
			ctx.textAlign = 'left';
			ctx.fillText(displayLabel, labelX, bar.y + bar.height / 2);

			ctx.textAlign = 'right';
			ctx.fillText(countText, countX, bar.y + bar.height / 2);
		}

		// Draw "more" indicator
		if (currentDistribution.hasMore) {
			ctx.fillStyle = colors.textMuted;
			ctx.font = '7px system-ui, sans-serif';
			ctx.textAlign = 'right';
			ctx.fillText('...more', currentWidth - CONFIG.padding.right, currentHeight - 2);
		}
	});

	// ============================================================================
	// Helper Functions
	// ============================================================================

	function getLabel(item: CategoricalItem): string {
		switch (labelFormat) {
			case 'decode':
				return item.decode || item.value;
			case 'both':
				return item.decode ? `${item.value} (${item.decode})` : item.value;
			default:
				return item.value;
		}
	}

	// ============================================================================
	// Event Handlers
	// ============================================================================

	function handleMouseMove(e: MouseEvent) {
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const y = e.clientY - rect.top;
		const x = e.clientX - rect.left;

		let found = false;
		for (const bar of barLayout) {
			if (y >= bar.y && y <= bar.y + bar.height && x >= CONFIG.padding.left && x <= width - CONFIG.padding.right) {
				if (hoveredIndex !== bar.index) hoveredIndex = bar.index;
				found = true;
				break;
			}
		}
		if (!found && hoveredIndex !== null) hoveredIndex = null;
	}

	function handleMouseLeave() {
		hoveredIndex = null;
	}

	function handleClick(e: MouseEvent) {
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const y = e.clientY - rect.top;
		const x = e.clientX - rect.left;

		// Check if click is on "...more" indicator (bottom right area)
		if (distribution.hasMore && y > height - 12 && x > width - 50) {
			showPopover = true;
			return;
		}

		for (const bar of barLayout) {
			if (y >= bar.y && y <= bar.y + bar.height) {
				toggleSelection(bar.item.value);
				break;
			}
		}
	}

	function toggleSelection(value: string) {
		const newSelected = new Set(selectedValues);
		if (newSelected.has(value)) {
			newSelected.delete(value);
		} else {
			newSelected.add(value);
		}

		if (newSelected.size === 0) {
			onFilterChange?.(null);
		} else {
			onFilterChange?.({
				type: 'set' as const,
				columnId: distribution.columnId,
				operator: 'in' as const,
				values: Array.from(newSelected)
			});
		}
	}

	function handleDoubleClick() {
		onFilterChange?.(null);
	}

	function handlePopoverSelectionChange(newSelection: Set<string>) {
		if (newSelection.size === 0) {
			onFilterChange?.(null);
		} else {
			onFilterChange?.({
				type: 'set',
				columnId: distribution.columnId,
				operator: 'in',
				values: Array.from(newSelection)
			});
		}
	}

	function handlePopoverClose() {
		showPopover = false;
	}
</script>

<div
	class="categorical-chart"
	style="width: {width}px; height: {height}px;"
	title={tooltipText || ''}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<canvas
		bind:this={canvas}
		style="width: {width}px; height: {height}px;"
		onmousemove={handleMouseMove}
		onmouseleave={handleMouseLeave}
		onclick={handleClick}
		ondblclick={handleDoubleClick}
		aria-label="Categorical distribution chart for {distribution.columnId}. Click values to filter."
	></canvas>
</div>

{#if showPopover}
	<ValuesPopover
		items={distribution.allItems}
		{selectedValues}
		{labelFormat}
		onSelectionChange={handlePopoverSelectionChange}
		onClose={handlePopoverClose}
	/>
{/if}

<style>
	.categorical-chart {
		position: relative;
		cursor: pointer;
	}
	canvas {
		display: block;
	}
</style>
