<script lang="ts">
	/**
	 * DateChart - Timeline for date data with brush selection
	 *
	 * Supports:
	 * - Click and drag to create brush selection
	 * - Drag brush to move selection
	 * - Drag handles to resize selection
	 * - Double-click to clear filter
	 * - Snap-to-bins for precise selection
	 */

	import type { DateDistribution } from '../../chart-filters';
	import type { Filter, DateFilter } from '../../types/filters';
	import { getChartColors } from './chartTheme';
	import {
		hitTest,
		calculateDragPosition,
		isBrushTooSmall,
		getCursorForDragMode,
		type BrushConfig,
		type BinEdges,
		type DragMode
	} from '../../chart-filters';

	// ============================================================================
	// Props
	// ============================================================================

	interface Props {
		distribution: DateDistribution;
		ghostDistribution?: DateDistribution; // Original distribution for ghost overlay
		width: number;
		height: number;
		filter?: Filter;
		onFilterChange?: (filter: Filter | null) => void;
	}

	let { distribution, ghostDistribution, width, height, filter, onFilterChange }: Props = $props();

	// ============================================================================
	// Configuration
	// ============================================================================

	const CONFIG = {
		padding: { top: 4, right: 4, bottom: 12, left: 4 }
	};

	const HANDLE_WIDTH = 1;
	const MIN_BRUSH_WIDTH = 8;
	const HANDLE_HIT_AREA = 6;

	// ============================================================================
	// State
	// ============================================================================

	let canvas: HTMLCanvasElement | undefined = $state(undefined);
	let hoveredIndex = $state<number | null>(null);

	// Brush state
	let brushStartPx: number | null = $state(null);
	let brushEndPx: number | null = $state(null);
	let isDragging = $state(false);
	let dragMode: DragMode = $state(null);

	// Drag tracking (non-reactive - only used during drag)
	let dragStartX = 0;
	let initialBrushStart = 0;
	let initialBrushEnd = 0;

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
	// Derived State
	// ============================================================================

	const chartWidth = $derived(width - CONFIG.padding.left - CONFIG.padding.right);
	const chartHeight = $derived(height - CONFIG.padding.top - CONFIG.padding.bottom);

	// Use ghost distribution's max for consistent scaling when ghost is shown
	const maxCount = $derived.by(() => {
		if (ghostDistribution && ghostDistribution.bins.length > 0) {
			return Math.max(...ghostDistribution.bins.map((b) => b.count), 1);
		}
		return Math.max(...distribution.bins.map((b) => b.count), 1);
	});

	const barWidth = $derived(distribution.bins.length > 0 ? chartWidth / distribution.bins.length : 0);

	// Create a map of ghost counts by bin index for quick lookup
	const ghostCounts = $derived.by(() => {
		if (!ghostDistribution) return null;
		return ghostDistribution.bins.map(b => b.count);
	});

	// Data range (timestamps)
	const dataMin = $derived(
		distribution.bins.length > 0 ? distribution.bins[0].date.getTime() : 0
	);
	const dataMax = $derived(
		distribution.bins.length > 0 ? distribution.bins[distribution.bins.length - 1].date.getTime() : 1
	);

	// Coordinate mapping functions
	const valueToPixel = $derived((timestamp: number): number => {
		const ratio = (timestamp - dataMin) / (dataMax - dataMin || 1);
		return CONFIG.padding.left + ratio * chartWidth;
	});

	const pixelToValue = $derived((pixel: number): number => {
		const ratio = (pixel - CONFIG.padding.left) / (chartWidth || 1);
		return dataMin + ratio * (dataMax - dataMin);
	});

	// Bin edges for snapping - must match bar drawing positions (index-based)
	const binEdges = $derived.by((): BinEdges => {
		const pixels: number[] = [];
		const values: number[] = [];
		const bins = distribution.bins;

		// Use index-based positioning to match how bars are drawn
		for (let i = 0; i < bins.length; i++) {
			const x = CONFIG.padding.left + i * barWidth;
			pixels.push(x);
			values.push(bins[i].date.getTime());
		}

		// Add right edge of last bin
		if (bins.length > 0) {
			const lastX = CONFIG.padding.left + bins.length * barWidth;
			pixels.push(lastX);
			// Estimate end timestamp
			if (bins.length > 1) {
				const lastTimestamp = bins[bins.length - 1].date.getTime();
				const secondLastTimestamp = bins[bins.length - 2].date.getTime();
				const binDuration = lastTimestamp - secondLastTimestamp;
				values.push(lastTimestamp + binDuration);
			} else {
				values.push(bins[0].date.getTime() + 86400000); // +1 day
			}
		}

		return { pixels, values };
	});

	// Brush configuration
	const brushConfig = $derived<BrushConfig>({
		chartLeft: CONFIG.padding.left,
		chartRight: width - CONFIG.padding.right,
		handleHitArea: HANDLE_HIT_AREA,
		minBrushWidth: MIN_BRUSH_WIDTH
	});

	// Filter range from external filter prop
	const filterRange = $derived.by(() => {
		if (!filter || filter.type !== 'date') return null;
		const f = filter as DateFilter;
		if (f.operator === 'between' && f.value2) {
			return {
				start: new Date(f.value).getTime(),
				end: new Date(f.value2).getTime()
			};
		}
		return null;
	});

	// Sync brush position from filter (when filter changes externally)
	$effect(() => {
		if (filterRange && !isDragging) {
			brushStartPx = valueToPixel(filterRange.start);
			brushEndPx = valueToPixel(filterRange.end);
		} else if (!filterRange && !isDragging) {
			brushStartPx = null;
			brushEndPx = null;
		}
	});

	// Brush rectangle for SVG overlay
	const brushRect = $derived.by(() => {
		if (brushStartPx === null || brushEndPx === null) return null;
		const left = Math.min(brushStartPx, brushEndPx);
		const right = Math.max(brushStartPx, brushEndPx);
		return {
			x: left,
			y: CONFIG.padding.top,
			width: right - left,
			height: chartHeight - 10
		};
	});

	// Cursor style based on drag mode
	const cursorStyle = $derived(getCursorForDragMode(dragMode, isDragging));

	const tooltipText = $derived.by(() => {
		if (hoveredIndex === null) return null;
		const bin = distribution.bins[hoveredIndex];
		if (!bin) return null;
		return `${formatDateShort(bin.date)}: ${bin.count}`;
	});

	// Brush colors from theme (reactive to theme changes)
	const brushColors = $derived.by(() => {
		void themeKey; // Track theme changes
		const colors = getChartColors();
		return {
			fill: colors.brushFill,
			stroke: colors.brushStroke,
			handle: colors.brushHandle
		};
	});

	// ============================================================================
	// Canvas Rendering
	// ============================================================================

	$effect(() => {
		const currentWidth = width;
		const currentHeight = height;
		const currentChartHeight = chartHeight;
		const currentMaxCount = maxCount;
		const currentDistribution = distribution;
		const currentGhostCounts = ghostCounts;
		const currentHoveredIndex = hoveredIndex;
		const currentBarWidth = barWidth;
		const currentBrushStart = brushStartPx;
		const currentBrushEnd = brushEndPx;
		void themeKey; // Track theme changes

		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Set canvas size (resets all state)
		const dpr = window.devicePixelRatio || 1;
		canvas.width = currentWidth * dpr;
		canvas.height = currentHeight * dpr;
		canvas.style.width = `${currentWidth}px`;
		canvas.style.height = `${currentHeight}px`;
		ctx.scale(dpr, dpr);

		const colors = getChartColors();
		ctx.clearRect(0, 0, currentWidth, currentHeight);

		const bins = currentDistribution.bins;
		if (bins.length === 0) {
			ctx.fillStyle = colors.text;
			ctx.font = '8px system-ui, sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('No dates', currentWidth / 2, currentHeight / 2);
			return;
		}

		// Calculate selected pixel range from brush
		const selectedPixelRange = (currentBrushStart !== null && currentBrushEnd !== null)
			? {
				left: Math.min(currentBrushStart, currentBrushEnd),
				right: Math.max(currentBrushStart, currentBrushEnd)
			}
			: null;

		// Draw ghost bars first (if ghost distribution exists)
		if (currentGhostCounts) {
			currentGhostCounts.forEach((ghostCount, index) => {
				if (ghostCount > 0) {
					const ghostBarHeight = (ghostCount / currentMaxCount) * (currentChartHeight - 10);
					const x = CONFIG.padding.left + index * currentBarWidth;
					const y = CONFIG.padding.top + (currentChartHeight - 10) - ghostBarHeight;

					ctx.fillStyle = colors.barGhost;
					ctx.fillRect(x + 1, y, currentBarWidth - 2, ghostBarHeight);
				}
			});
		}

		// Draw active bars
		bins.forEach((bin, index) => {
			const barHeight = (bin.count / currentMaxCount) * (currentChartHeight - 10);
			const x = CONFIG.padding.left + index * currentBarWidth;
			const y = CONFIG.padding.top + (currentChartHeight - 10) - barHeight;

			// Determine color based on selection and hover state
			let color = colors.bar;
			const isHovered = currentHoveredIndex === index;

			if (selectedPixelRange) {
				// Check if the bar's left edge is within the selected pixel range
				const binInRange = x >= selectedPixelRange.left && x < selectedPixelRange.right;
				color = binInRange ? colors.barSelected : colors.barMuted;
			}

			if (isHovered && !isDragging) {
				color = colors.barHover;
			}

			ctx.fillStyle = color;
			ctx.fillRect(x + 1, y, currentBarWidth - 2, barHeight);
		});

		// Draw date range labels
		ctx.fillStyle = colors.text;
		ctx.font = '7px system-ui, sans-serif';

		const firstBin = bins[0];
		const lastBin = bins[bins.length - 1];

		ctx.textAlign = 'left';
		ctx.fillText(formatDateShort(firstBin.date), CONFIG.padding.left, currentHeight - 2);

		ctx.textAlign = 'right';
		ctx.fillText(formatDateShort(lastBin.date), currentWidth - CONFIG.padding.right, currentHeight - 2);
	});

	// ============================================================================
	// Helper Functions
	// ============================================================================

	function formatDateShort(date: Date): string {
		const month = date.toLocaleDateString(undefined, { month: 'short' });
		const year = date.getFullYear().toString().slice(-2);
		return `${month}'${year}`;
	}

	function getBinIndexAtPosition(x: number): number | null {
		const bins = distribution.bins;
		if (bins.length === 0) return null;

		const chartX = x - CONFIG.padding.left;
		if (chartX < 0 || chartX > chartWidth) return null;

		const index = Math.floor(chartX / barWidth);
		if (index < 0 || index >= bins.length) return null;

		return index;
	}

	function getMouseX(e: MouseEvent): number {
		const target = e.currentTarget as Element;
		const rect = target.getBoundingClientRect();
		return e.clientX - rect.left;
	}

	function snapToNearestEdge(pixel: number): number {
		if (binEdges.pixels.length === 0) return pixel;
		let nearestPixel = binEdges.pixels[0];
		let minDistance = Math.abs(pixel - nearestPixel);
		for (const edge of binEdges.pixels) {
			const distance = Math.abs(pixel - edge);
			if (distance < minDistance) {
				minDistance = distance;
				nearestPixel = edge;
			}
		}
		return nearestPixel;
	}

	function emitFilter() {
		if (brushStartPx === null || brushEndPx === null) {
			onFilterChange?.(null);
			return;
		}

		const left = Math.min(brushStartPx, brushEndPx);
		const right = Math.max(brushStartPx, brushEndPx);
		const startTimestamp = pixelToValue(left);
		const endTimestamp = pixelToValue(right);

		onFilterChange?.({
			type: 'date',
			columnId: distribution.columnId,
			operator: 'between',
			value: new Date(startTimestamp).toISOString(),
			value2: new Date(endTimestamp).toISOString()
		});
	}

	// ============================================================================
	// Event Handlers (Brush-based)
	// ============================================================================

	function handleMouseDown(e: MouseEvent) {
		const x = getMouseX(e);
		const hit = hitTest(x, brushStartPx, brushEndPx, brushConfig);
		const snapEnabled = !e.shiftKey; // Hold Shift to disable snap

		dragMode = hit.mode;
		isDragging = true;
		hoveredIndex = null;
		dragStartX = x;

		if (brushStartPx !== null && brushEndPx !== null) {
			initialBrushStart = brushStartPx;
			initialBrushEnd = brushEndPx;
		}

		if (hit.mode === 'create') {
			const snappedX = snapEnabled ? snapToNearestEdge(x) : x;
			brushStartPx = snappedX;
			brushEndPx = snappedX;
			initialBrushStart = snappedX;
			initialBrushEnd = snappedX;
		}
	}

	function handleMouseMove(e: MouseEvent) {
		const x = getMouseX(e);
		const y = e.clientY - (e.currentTarget as Element).getBoundingClientRect().top;

		if (!isDragging) {
			// Only show hover if mouse is in the bar area (not the label area)
			if (y > height - CONFIG.padding.bottom) {
				if (hoveredIndex !== null) hoveredIndex = null;
				return;
			}

			const hit = hitTest(x, brushStartPx, brushEndPx, brushConfig);
			dragMode = hit.mode; // Update cursor preview

			const index = getBinIndexAtPosition(x);
			if (index !== hoveredIndex) {
				hoveredIndex = index;
			}
			return;
		}

		// Dragging - calculate new brush position
		const snapEnabled = !e.shiftKey; // Hold Shift to disable snap
		const result = calculateDragPosition(
			dragMode,
			x,
			dragStartX,
			initialBrushStart,
			initialBrushEnd,
			brushConfig,
			binEdges,
			snapEnabled
		);

		if (result) {
			brushStartPx = result.start;
			brushEndPx = result.end;
		}
	}

	function handleMouseUp(e?: MouseEvent) {
		if (isDragging && dragMode === 'create') {
			if (isBrushTooSmall(brushStartPx, brushEndPx, MIN_BRUSH_WIDTH)) {
				if (e) {
					// Brush too small - check if this was a click on a bin
					const x = getMouseX(e);
					const binIndex = getBinIndexAtPosition(x);

					if (binIndex !== null && binEdges.pixels.length > binIndex + 1) {
						// Single click on a bin - select just that bin
						brushStartPx = binEdges.pixels[binIndex];
						brushEndPx = binEdges.pixels[binIndex + 1];
					} else {
						// Click outside bins - clear selection
						brushStartPx = null;
						brushEndPx = null;
					}
				} else {
					// No event (e.g. mouse left the chart) - clear selection
					brushStartPx = null;
					brushEndPx = null;
				}
			}
		}

		if (isDragging) {
			emitFilter();
		}

		isDragging = false;
		dragMode = null;
	}

	function handleMouseLeave() {
		if (isDragging) {
			handleMouseUp();
		}
		hoveredIndex = null;
		dragMode = null;
	}

	function handleDoubleClick() {
		brushStartPx = null;
		brushEndPx = null;
		onFilterChange?.(null);
	}
</script>

<div
	class="date-chart"
	style="width: {width}px; height: {height}px;"
	title={tooltipText || ''}
>
	<canvas
		bind:this={canvas}
		style="width: {width}px; height: {height}px;"
	></canvas>

	<!-- SVG overlay for brush interaction -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<svg
		class="brush-overlay"
		{width}
		{height}
		style="cursor: {cursorStyle};"
		role="application"
		aria-label="Date timeline brush selection for {distribution.columnId}. Click and drag to select a range."
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={(e) => handleMouseUp(e)}
		onmouseleave={handleMouseLeave}
		ondblclick={handleDoubleClick}
	>
		{#if brushRect}
			<!-- Brush selection area -->
			<rect
				x={brushRect.x}
				y={brushRect.y}
				width={brushRect.width}
				height={brushRect.height}
				fill={brushColors.fill}
				stroke={brushColors.stroke}
				stroke-width="1"
			/>
			<!-- Left handle -->
			<rect
				x={brushRect.x - HANDLE_WIDTH / 2}
				y={brushRect.y}
				width={HANDLE_WIDTH}
				height={brushRect.height}
				fill={brushColors.handle}
				rx="1"
			/>
			<!-- Right handle -->
			<rect
				x={brushRect.x + brushRect.width - HANDLE_WIDTH / 2}
				y={brushRect.y}
				width={HANDLE_WIDTH}
				height={brushRect.height}
				fill={brushColors.handle}
				rx="1"
			/>
		{/if}
	</svg>
</div>

<style>
	.date-chart {
		position: relative;
	}

	canvas {
		display: block;
	}

	.brush-overlay {
		position: absolute;
		top: 0;
		left: 0;
		user-select: none;
	}
</style>
