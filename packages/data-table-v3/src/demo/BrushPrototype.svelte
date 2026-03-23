<script lang="ts">
	/**
	 * Brush-on-Canvas Prototype (Refactored)
	 *
	 * Clean architecture:
	 * - BrushEngine.ts: Pure brush interaction logic
	 * - HistogramRenderer.ts: Canvas drawing utilities
	 * - This component: State management and event wiring
	 */

	import {
		// Brush logic
		computeBinEdges,
		hitTest,
		calculateDragPosition,
		isBrushTooSmall,
		getCursorForDragMode,
		type BrushConfig,
		type BinEdges,
		type DragMode,
		// Histogram rendering
		setupCanvas,
		computeBarGeometry,
		renderHistogram,
		renderAxisLabels,
		findBinAtPosition,
		createCoordinateMapper,
		type Bin,
		type HistogramConfig,
		type BarGeometry,
		type CoordinateMapper
	} from '../lib/chart-filters';

	// === Configuration ===
	const HISTOGRAM_CONFIG: HistogramConfig = {
		width: 400,
		height: 120,
		padding: { top: 10, right: 10, bottom: 25, left: 10 },
		barGap: 2,
		colors: {
			bar: '#6366f1',
			barHover: '#818cf8',
			barSelected: '#4f46e5',
			barMuted: '#c7d2fe',
			text: '#475569'
		}
	};

	const BRUSH_CONFIG: BrushConfig = {
		chartLeft: HISTOGRAM_CONFIG.padding.left,
		chartRight: HISTOGRAM_CONFIG.width - HISTOGRAM_CONFIG.padding.right,
		handleHitArea: 8,
		minBrushWidth: 10
	};

	const SVG_COLORS = {
		brush: 'rgba(99, 102, 241, 0.3)',
		brushStroke: '#4f46e5',
		handle: '#4f46e5'
	};

	const HANDLE_WIDTH = 4;

	// === Sample Data ===
	const sampleData = generateSampleData();

	function generateSampleData(): number[] {
		const values: number[] = [];
		for (let i = 0; i < 1000; i++) {
			const u1 = Math.random();
			const u2 = Math.random();
			const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
			const age = Math.round(50 + z * 15);
			values.push(Math.max(18, Math.min(85, age)));
		}
		return values;
	}

	function calculateBins(data: number[], binCount: number = 12): Bin[] {
		const min = Math.min(...data);
		const max = Math.max(...data);
		const binWidth = (max - min) / binCount;

		const bins: Bin[] = [];
		for (let i = 0; i < binCount; i++) {
			bins.push({
				x0: min + i * binWidth,
				x1: min + (i + 1) * binWidth,
				count: 0,
				percentage: 0
			});
		}

		for (const value of data) {
			const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
			bins[binIndex].count++;
		}

		const total = data.length;
		for (const bin of bins) {
			bin.percentage = (bin.count / total) * 100;
		}

		return bins;
	}

	// === Precomputed Data (computed once) ===
	const bins = calculateBins(sampleData);
	const maxCount = Math.max(...bins.map((b) => b.count));
	const dataMin = bins[0].x0;
	const dataMax = bins[bins.length - 1].x1;

	// Coordinate mapper
	const coords: CoordinateMapper = createCoordinateMapper(dataMin, dataMax, HISTOGRAM_CONFIG);

	// Bar geometry (static)
	const bars: BarGeometry[] = computeBarGeometry(bins, maxCount, HISTOGRAM_CONFIG);

	// Bin edges for snapping (static)
	const binEdges: BinEdges = computeBinEdges(bins, coords.valueToPixel);

	// === Reactive State ===
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let hoveredBinIndex: number | null = $state(null);
	let snapToBins = $state(true);

	// Brush state
	let brushStart: number | null = $state(null);
	let brushEnd: number | null = $state(null);
	let isDragging = $state(false);
	let dragMode: DragMode = $state(null);

	// Drag tracking (non-reactive - only used during drag)
	let dragStartX = 0;
	let initialBrushStart = 0;
	let initialBrushEnd = 0;

	// === Derived State ===
	const chartHeight = HISTOGRAM_CONFIG.height - HISTOGRAM_CONFIG.padding.top - HISTOGRAM_CONFIG.padding.bottom;

	let selectedRange = $derived.by(() => {
		if (brushStart === null || brushEnd === null) return null;
		const left = Math.min(brushStart, brushEnd);
		const right = Math.max(brushStart, brushEnd);
		return { min: coords.pixelToValue(left), max: coords.pixelToValue(right) };
	});

	let filteredCount = $derived.by(() => {
		if (!selectedRange) return sampleData.length;
		return sampleData.filter((v) => v >= selectedRange.min && v <= selectedRange.max).length;
	});

	let cursorStyle = $derived(getCursorForDragMode(dragMode, isDragging));

	let brushRect = $derived.by(() => {
		if (brushStart === null || brushEnd === null) return null;
		const left = Math.min(brushStart, brushEnd);
		const right = Math.max(brushStart, brushEnd);
		return {
			x: left,
			y: HISTOGRAM_CONFIG.padding.top,
			width: right - left,
			height: chartHeight
		};
	});

	// === Canvas Setup (once on mount) ===
	$effect(() => {
		if (canvas && !ctx) {
			ctx = setupCanvas(canvas, HISTOGRAM_CONFIG.width, HISTOGRAM_CONFIG.height);
			render();
		}
	});

	// === Rendering ===
	function render() {
		if (!ctx) return;

		const state = {
			hoveredBinIndex,
			selectedRange: selectedRange
		};

		renderHistogram(ctx, bars, state, HISTOGRAM_CONFIG);
		renderAxisLabels(ctx, dataMin, dataMax, HISTOGRAM_CONFIG);
	}

	// === Event Handlers ===
	function handleMouseDown(e: MouseEvent) {
		const x = getMouseX(e);
		const hit = hitTest(x, brushStart, brushEnd, BRUSH_CONFIG);

		dragMode = hit.mode;
		isDragging = true;
		hoveredBinIndex = null;
		dragStartX = x;

		if (brushStart !== null && brushEnd !== null) {
			initialBrushStart = brushStart;
			initialBrushEnd = brushEnd;
		}

		if (hit.mode === 'create') {
			const snappedX = snapToBins
				? binEdges.pixels.reduce((nearest, edge) =>
						Math.abs(edge - x) < Math.abs(nearest - x) ? edge : nearest
					)
				: x;
			brushStart = snappedX;
			brushEnd = snappedX;
			initialBrushStart = snappedX;
			initialBrushEnd = snappedX;
		}

		render();
	}

	function handleMouseMove(e: MouseEvent) {
		const x = getMouseX(e);

		if (!isDragging) {
			const oldHover = hoveredBinIndex;
			hoveredBinIndex = findBinAtPosition(x, bars, HISTOGRAM_CONFIG);
			if (oldHover !== hoveredBinIndex) {
				render();
			}
			return;
		}

		const result = calculateDragPosition(
			dragMode,
			x,
			dragStartX,
			initialBrushStart,
			initialBrushEnd,
			BRUSH_CONFIG,
			binEdges,
			snapToBins
		);

		if (result) {
			brushStart = result.start;
			brushEnd = result.end;
		}

		render();
	}

	function handleMouseUp() {
		if (isDragging && dragMode === 'create') {
			if (isBrushTooSmall(brushStart, brushEnd, BRUSH_CONFIG.minBrushWidth)) {
				brushStart = null;
				brushEnd = null;
			}
		}

		isDragging = false;
		dragMode = null;
		render();
	}

	function handleMouseLeave() {
		if (isDragging) {
			handleMouseUp();
		}
		hoveredBinIndex = null;
		render();
	}

	function handleDoubleClick() {
		brushStart = null;
		brushEnd = null;
		render();
	}

	function getMouseX(e: MouseEvent): number {
		const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
		return e.clientX - rect.left;
	}
</script>

<div class="prototype-container">
	<h2>Brush-on-Canvas Prototype (Refactored)</h2>
	<p class="description">
		Clean architecture: BrushEngine.ts + HistogramRenderer.ts + thin Svelte wrapper.
		<br />Click and drag to create a selection. Drag handles to resize. Double-click to clear.
	</p>

	<div
		class="chart-container"
		style="width: {HISTOGRAM_CONFIG.width}px; height: {HISTOGRAM_CONFIG.height}px;"
	>
		<canvas bind:this={canvas}></canvas>

		<svg
			class="brush-overlay"
			width={HISTOGRAM_CONFIG.width}
			height={HISTOGRAM_CONFIG.height}
			style="cursor: {cursorStyle};"
			role="application"
			aria-label="Histogram brush selection. Click and drag to select a range."
			onmousedown={handleMouseDown}
			onmousemove={handleMouseMove}
			onmouseup={handleMouseUp}
			onmouseleave={handleMouseLeave}
			ondblclick={handleDoubleClick}
		>
			{#if brushRect}
				<rect
					x={brushRect.x}
					y={brushRect.y}
					width={brushRect.width}
					height={brushRect.height}
					fill={SVG_COLORS.brush}
					stroke={SVG_COLORS.brushStroke}
					stroke-width="1"
				/>
				<rect
					x={brushRect.x - HANDLE_WIDTH / 2}
					y={brushRect.y}
					width={HANDLE_WIDTH}
					height={brushRect.height}
					fill={SVG_COLORS.handle}
					opacity="0.7"
					rx="2"
					class="handle"
				/>
				<rect
					x={brushRect.x + brushRect.width - HANDLE_WIDTH / 2}
					y={brushRect.y}
					width={HANDLE_WIDTH}
					height={brushRect.height}
					fill={SVG_COLORS.handle}
					opacity="0.7"
					rx="2"
					class="handle"
				/>
			{/if}
		</svg>
	</div>

	<div class="options-panel">
		<label class="toggle-label">
			<input type="checkbox" bind:checked={snapToBins} />
			<span>Snap to bins</span>
		</label>
	</div>

	<div class="debug-panel">
		<h3>State</h3>
		<div class="debug-grid">
			<div class="debug-item">
				<span class="label">Dragging:</span>
				<span class="value">{isDragging ? `Yes (${dragMode})` : 'No'}</span>
			</div>
			<div class="debug-item">
				<span class="label">Brush (px):</span>
				<span class="value">
					{brushStart !== null ? `${brushStart.toFixed(1)} - ${brushEnd?.toFixed(1)}` : 'None'}
				</span>
			</div>
			<div class="debug-item">
				<span class="label">Selected Range:</span>
				<span class="value highlight">
					{selectedRange
						? `${selectedRange.min.toFixed(1)} - ${selectedRange.max.toFixed(1)}`
						: 'None'}
				</span>
			</div>
			<div class="debug-item">
				<span class="label">Filtered Count:</span>
				<span class="value highlight">
					{filteredCount} / {sampleData.length} ({(
						(filteredCount / sampleData.length) *
						100
					).toFixed(1)}%)
				</span>
			</div>
			<div class="debug-item">
				<span class="label">Hovered Bin:</span>
				<span class="value">
					{hoveredBinIndex !== null
						? `#${hoveredBinIndex} (${bins[hoveredBinIndex].count} items)`
						: 'None'}
				</span>
			</div>
		</div>
	</div>

	<div class="learnings">
		<h3>Architecture</h3>
		<ul>
			<li><strong>BrushEngine.ts:</strong> Pure logic - snap, constrain, hit detection, drag calculation</li>
			<li><strong>HistogramRenderer.ts:</strong> Canvas setup, bar geometry, rendering</li>
			<li><strong>Component:</strong> State management, event wiring, SVG overlay</li>
			<li><strong>Precomputed:</strong> Bin edges, bar geometry, coordinate mapper (computed once)</li>
		</ul>
	</div>
</div>

<style>
	.prototype-container {
		font-family: system-ui, -apple-system, sans-serif;
		padding: 20px;
		max-width: 600px;
	}

	h2 {
		margin: 0 0 8px 0;
		font-size: 18px;
		font-weight: 600;
	}

	h3 {
		margin: 0 0 8px 0;
		font-size: 14px;
		font-weight: 600;
		color: #374151;
	}

	.description {
		margin: 0 0 16px 0;
		font-size: 13px;
		color: #6b7280;
		line-height: 1.5;
	}

	.chart-container {
		position: relative;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
		background: #fafafa;
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

	.handle {
		cursor: ew-resize;
	}

	.options-panel {
		margin-top: 12px;
		padding: 8px 12px;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		display: flex;
		gap: 16px;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: #374151;
		cursor: pointer;
	}

	.toggle-label input[type='checkbox'] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.debug-panel {
		margin-top: 16px;
		padding: 12px;
		background: #f3f4f6;
		border-radius: 8px;
	}

	.debug-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.debug-item {
		font-size: 12px;
	}

	.debug-item .label {
		color: #6b7280;
	}

	.debug-item .value {
		color: #111827;
		font-family: 'SF Mono', Monaco, monospace;
	}

	.debug-item .value.highlight {
		color: #4f46e5;
		font-weight: 600;
	}

	.learnings {
		margin-top: 16px;
		padding: 12px;
		background: #eff6ff;
		border-radius: 8px;
		border: 1px solid #bfdbfe;
	}

	.learnings ul {
		margin: 0;
		padding-left: 20px;
		font-size: 12px;
		line-height: 1.6;
		color: #1e40af;
	}

	.learnings li {
		margin-bottom: 4px;
	}

	.learnings strong {
		color: #1e3a8a;
	}
</style>
