<script lang="ts">
	/**
	 * NumericalChart - Histogram/Line chart for numerical data with brush selection
	 *
	 * Supports:
	 * - Three display modes: bar (histogram), line-smooth (Catmull-Rom), line-linear
	 * - Click and drag to create brush selection
	 * - Drag brush to move selection
	 * - Drag handles to resize selection
	 * - Double-click to clear filter
	 * - Snap-to-bins for precise selection
	 */

	import type { NumericalDistribution } from '../../chart-filters';
	import type { Filter, NumericFilter } from '../../types/filters';
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

	export type ChartDisplayMode = 'bar' | 'line-smooth' | 'line-linear';

	// ============================================================================
	// Props
	// ============================================================================

	interface Props {
		distribution: NumericalDistribution;
		ghostDistribution?: NumericalDistribution; // Original distribution for ghost overlay
		width: number;
		height: number;
		filter?: Filter;
		onFilterChange?: (filter: Filter | null) => void;
		displayMode?: ChartDisplayMode;
	}

	let { distribution, ghostDistribution, width, height, filter, onFilterChange, displayMode = 'bar' }: Props = $props();

	// ============================================================================
	// Configuration
	// ============================================================================

	const CONFIG = {
		padding: { top: 4, right: 4, bottom: 12, left: 4 }
	};

	// ============================================================================
	// Configuration
	// ============================================================================

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

	// Data range
	const dataMin = $derived(distribution.bins.length > 0 ? distribution.bins[0].x0 : 0);
	const dataMax = $derived(distribution.bins.length > 0 ? distribution.bins[distribution.bins.length - 1].x1 : 1);

	// Coordinate mapping functions
	const valueToPixel = $derived((value: number): number => {
		const ratio = (value - dataMin) / (dataMax - dataMin || 1);
		return CONFIG.padding.left + ratio * chartWidth;
	});

	const pixelToValue = $derived((pixel: number): number => {
		const ratio = (pixel - CONFIG.padding.left) / (chartWidth || 1);
		return dataMin + ratio * (dataMax - dataMin);
	});

	// Bin edges for snapping
	const binEdges = $derived.by((): BinEdges => {
		const pixels: number[] = [];
		const values: number[] = [];
		for (const bin of distribution.bins) {
			pixels.push(valueToPixel(bin.x0));
			values.push(bin.x0);
		}
		if (distribution.bins.length > 0) {
			const lastBin = distribution.bins[distribution.bins.length - 1];
			pixels.push(valueToPixel(lastBin.x1));
			values.push(lastBin.x1);
		}
		return { pixels, values };
	});

	// Brush configuration (derived from current dimensions)
	const brushConfig = $derived<BrushConfig>({
		chartLeft: CONFIG.padding.left,
		chartRight: width - CONFIG.padding.right,
		handleHitArea: HANDLE_HIT_AREA,
		minBrushWidth: MIN_BRUSH_WIDTH
	});

	// Filter range from external filter prop
	const filterRange = $derived.by(() => {
		if (!filter || filter.type !== 'numeric') return null;
		const f = filter as NumericFilter;
		if (f.operator === 'between' && f.value2 !== undefined) {
			return { min: f.value, max: f.value2 };
		}
		return null;
	});

	// Sync brush position from filter (when filter changes externally)
	$effect(() => {
		if (filterRange && !isDragging) {
			brushStartPx = valueToPixel(filterRange.min);
			brushEndPx = valueToPixel(filterRange.max);
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
		return `${bin.x0.toFixed(1)} - ${bin.x1.toFixed(1)}: ${bin.count}`;
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
	// Line Drawing Helpers
	// ============================================================================

	/**
	 * Get bin midpoint X coordinates and Y values (counts normalized to height)
	 */
	function getBinPoints(
		bins: { x0: number; x1: number; count: number }[],
		maxCount: number,
		chartH: number,
		barW: number
	): { x: number; y: number }[] {
		return bins.map((bin, index) => {
			const x = CONFIG.padding.left + index * barW + barW / 2;
			const normalizedCount = bin.count / maxCount;
			const y = CONFIG.padding.top + (chartH - 10) * (1 - normalizedCount);
			return { x, y };
		});
	}

	/**
	 * Draw a linear line through points
	 */
	function drawLinearLine(
		ctx: CanvasRenderingContext2D,
		points: { x: number; y: number }[],
		color: string,
		lineWidth: number = 1.5
	) {
		if (points.length < 2) return;

		ctx.beginPath();
		ctx.moveTo(points[0].x, points[0].y);

		for (let i = 1; i < points.length; i++) {
			ctx.lineTo(points[i].x, points[i].y);
		}

		ctx.strokeStyle = color;
		ctx.lineWidth = lineWidth;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.stroke();
	}

	/**
	 * Draw a smooth Catmull-Rom spline through points
	 * Uses tension parameter to control curve smoothness (0.5 is standard)
	 */
	function drawSmoothLine(
		ctx: CanvasRenderingContext2D,
		points: { x: number; y: number }[],
		color: string,
		lineWidth: number = 1.5,
		tension: number = 0.5
	) {
		if (points.length < 2) return;

		ctx.beginPath();
		ctx.moveTo(points[0].x, points[0].y);

		if (points.length === 2) {
			// Only 2 points - draw a straight line
			ctx.lineTo(points[1].x, points[1].y);
		} else {
			// Catmull-Rom spline
			for (let i = 0; i < points.length - 1; i++) {
				const p0 = points[i === 0 ? 0 : i - 1];
				const p1 = points[i];
				const p2 = points[i + 1];
				const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

				// Calculate control points
				const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
				const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
				const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
				const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

				ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
			}
		}

		ctx.strokeStyle = color;
		ctx.lineWidth = lineWidth;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.stroke();
	}

	/**
	 * Draw points/dots at each bin position
	 */
	function drawPoints(
		ctx: CanvasRenderingContext2D,
		points: { x: number; y: number }[],
		color: string,
		radius: number = 2
	) {
		for (const point of points) {
			ctx.beginPath();
			ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
			ctx.fillStyle = color;
			ctx.fill();
		}
	}

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
		const currentGhostDistribution = ghostDistribution;
		const currentHoveredIndex = hoveredIndex;
		const currentBarWidth = barWidth;
		const currentBrushStart = brushStartPx;
		const currentBrushEnd = brushEndPx;
		const currentDisplayMode = displayMode;
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
		if (bins.length === 0) return;

		// Calculate selected range from brush pixels
		const selectedRange = (currentBrushStart !== null && currentBrushEnd !== null)
			? {
				min: pixelToValue(Math.min(currentBrushStart, currentBrushEnd)),
				max: pixelToValue(Math.max(currentBrushStart, currentBrushEnd))
			}
			: null;

		// ========== BAR MODE ==========
		if (currentDisplayMode === 'bar') {
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

				if (selectedRange) {
					// Check if the bin overlaps with the selected range
					const binInRange = bin.x1 > selectedRange.min && bin.x0 < selectedRange.max;
					color = binInRange ? colors.barSelected : colors.barMuted;
				}

				if (isHovered && !isDragging) {
					color = colors.barHover;
				}

				ctx.fillStyle = color;
				ctx.fillRect(x + 1, y, currentBarWidth - 2, barHeight);
			});
		}
		// ========== LINE MODES ==========
		else {
			const isSmooth = currentDisplayMode === 'line-smooth';

			// Get points for current distribution
			const points = getBinPoints(bins, currentMaxCount, currentChartHeight, currentBarWidth);

			// Draw ghost line first (if ghost distribution exists)
			if (currentGhostDistribution && currentGhostDistribution.bins.length > 0) {
				const ghostPoints = getBinPoints(
					currentGhostDistribution.bins,
					currentMaxCount,
					currentChartHeight,
					currentBarWidth
				);

				if (isSmooth) {
					drawSmoothLine(ctx, ghostPoints, colors.barGhost, 1.5);
				} else {
					drawLinearLine(ctx, ghostPoints, colors.barGhost, 1.5);
				}
			}

			// Draw the active line
			// For line mode with selection, we draw the full line muted, then overlay selected portion
			if (selectedRange) {
				// Draw full line in muted color
				if (isSmooth) {
					drawSmoothLine(ctx, points, colors.barMuted, 2);
				} else {
					drawLinearLine(ctx, points, colors.barMuted, 2);
				}

				// Find points within selected range and draw them highlighted
				const selectedPoints = points.filter((_, index) => {
					const bin = bins[index];
					return bin.x1 > selectedRange.min && bin.x0 < selectedRange.max;
				});

				if (selectedPoints.length > 0) {
					if (isSmooth && selectedPoints.length > 1) {
						drawSmoothLine(ctx, selectedPoints, colors.barSelected, 2.5);
					} else {
						drawLinearLine(ctx, selectedPoints, colors.barSelected, 2.5);
					}
					drawPoints(ctx, selectedPoints, colors.barSelected, 2.5);
				}
			} else {
				// No selection - draw normal line
				if (isSmooth) {
					drawSmoothLine(ctx, points, colors.bar, 2);
				} else {
					drawLinearLine(ctx, points, colors.bar, 2);
				}

				// Draw points at bin positions
				drawPoints(ctx, points, colors.bar, 2);

				// Highlight hovered point
				if (currentHoveredIndex !== null && !isDragging && points[currentHoveredIndex]) {
					const hoveredPoint = points[currentHoveredIndex];
					drawPoints(ctx, [hoveredPoint], colors.barHover, 3.5);
				}
			}
		}

		// Draw mean/median indicator lines
		const stats = currentDistribution.stats;
		const chartTop = CONFIG.padding.top;
		const chartBottom = CONFIG.padding.top + currentChartHeight - 10;

		// Mean line (solid) with μ label
		if (stats.mean !== undefined && stats.mean >= stats.min && stats.mean <= stats.max) {
			const meanX = valueToPixel(stats.mean);
			ctx.beginPath();
			ctx.moveTo(meanX, chartTop + 8); // Start below label
			ctx.lineTo(meanX, chartBottom);
			ctx.strokeStyle = colors.meanLine;
			ctx.lineWidth = 1;
			ctx.stroke();
			// Label
			ctx.font = '7px system-ui, sans-serif';
			ctx.fillStyle = colors.meanLine;
			ctx.textAlign = 'center';
			ctx.fillText('μ', meanX, chartTop + 6);
		}

		// Median line (dashed) with M̃ label
		if (stats.median !== undefined && stats.median >= stats.min && stats.median <= stats.max) {
			const medianX = valueToPixel(stats.median);
			ctx.beginPath();
			ctx.setLineDash([3, 3]);
			ctx.moveTo(medianX, chartTop + 8); // Start below label
			ctx.lineTo(medianX, chartBottom);
			ctx.strokeStyle = colors.medianLine;
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.setLineDash([]); // Reset dash
			// Label
			ctx.font = '7px system-ui, sans-serif';
			ctx.fillStyle = colors.medianLine;
			ctx.textAlign = 'center';
			ctx.fillText('M̃', medianX, chartTop + 6);
		}

		// Draw min/max labels
		ctx.fillStyle = colors.text;
		ctx.font = '7px system-ui, sans-serif';
		ctx.textAlign = 'left';
		ctx.fillText(currentDistribution.stats.min.toFixed(0), CONFIG.padding.left, currentHeight - 2);
		ctx.textAlign = 'right';
		ctx.fillText(currentDistribution.stats.max.toFixed(0), currentWidth - CONFIG.padding.right, currentHeight - 2);
	});

	// ============================================================================
	// Helper Functions
	// ============================================================================

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
		const minValue = pixelToValue(left);
		const maxValue = pixelToValue(right);

		onFilterChange?.({
			type: 'numeric',
			columnId: distribution.columnId,
			operator: 'between',
			value: minValue,
			value2: maxValue
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
	class="numerical-chart"
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
		aria-label="Histogram brush selection for {distribution.columnId}. Click and drag to select a range."
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
	.numerical-chart {
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
