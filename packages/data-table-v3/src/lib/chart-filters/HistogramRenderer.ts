/**
 * HistogramRenderer - Canvas drawing for histogram charts
 *
 * Handles HiDPI setup (once) and efficient per-frame rendering
 */

export interface Bin {
	x0: number;
	x1: number;
	count: number;
	percentage: number;
}

export interface HistogramColors {
	bar: string;
	barHover: string;
	barSelected: string;
	barMuted: string;
	text: string;
}

export interface HistogramConfig {
	width: number;
	height: number;
	padding: { top: number; right: number; bottom: number; left: number };
	barGap: number;
	colors: HistogramColors;
}

export interface HistogramRenderState {
	hoveredBinIndex: number | null;
	selectedRange: { min: number; max: number } | null;
}

/**
 * Setup canvas for HiDPI displays (call once on mount/resize)
 */
export function setupCanvas(
	canvas: HTMLCanvasElement,
	width: number,
	height: number
): CanvasRenderingContext2D | null {
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	const dpr = window.devicePixelRatio || 1;
	canvas.width = width * dpr;
	canvas.height = height * dpr;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;
	ctx.scale(dpr, dpr);

	return ctx;
}

/**
 * Precompute bar positions (call once when bins change)
 */
export interface BarGeometry {
	x: number;
	y: number;
	width: number;
	height: number;
	bin: Bin;
}

export function computeBarGeometry(
	bins: Bin[],
	maxCount: number,
	config: HistogramConfig
): BarGeometry[] {
	const chartWidth = config.width - config.padding.left - config.padding.right;
	const chartHeight = config.height - config.padding.top - config.padding.bottom;
	const barWidth = (chartWidth - (bins.length - 1) * config.barGap) / bins.length;

	return bins.map((bin, index) => {
		const x = config.padding.left + index * (barWidth + config.barGap);
		const barHeight = (bin.count / maxCount) * chartHeight;
		const y = config.padding.top + chartHeight - barHeight;

		return { x, y, width: barWidth, height: barHeight, bin };
	});
}

/**
 * Render histogram frame (call on every state change)
 */
export function renderHistogram(
	ctx: CanvasRenderingContext2D,
	bars: BarGeometry[],
	state: HistogramRenderState,
	config: HistogramConfig
): void {
	// Clear
	ctx.clearRect(0, 0, config.width, config.height);

	// Draw bars
	bars.forEach((bar, index) => {
		let color = config.colors.bar;

		// Selection state
		if (state.selectedRange) {
			const binOverlaps =
				bar.bin.x1 > state.selectedRange.min && bar.bin.x0 < state.selectedRange.max;
			color = binOverlaps ? config.colors.barSelected : config.colors.barMuted;
		}

		// Hover state (overrides selection coloring)
		if (index === state.hoveredBinIndex) {
			color = config.colors.barHover;
		}

		ctx.fillStyle = color;
		ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
	});
}

/**
 * Render x-axis labels
 */
export function renderAxisLabels(
	ctx: CanvasRenderingContext2D,
	dataMin: number,
	dataMax: number,
	config: HistogramConfig
): void {
	ctx.fillStyle = config.colors.text;
	ctx.font = '10px system-ui, sans-serif';
	ctx.textAlign = 'center';

	// Start label
	ctx.fillText(dataMin.toFixed(0), config.padding.left, config.height - 5);

	// End label
	ctx.fillText(dataMax.toFixed(0), config.width - config.padding.right, config.height - 5);

	// Middle label
	const midValue = (dataMin + dataMax) / 2;
	ctx.fillText(midValue.toFixed(0), config.width / 2, config.height - 5);
}

/**
 * Find which bin index is at a given x coordinate
 */
export function findBinAtPosition(
	x: number,
	bars: BarGeometry[],
	config: HistogramConfig
): number | null {
	if (x < config.padding.left || x > config.width - config.padding.right) {
		return null;
	}

	for (let i = 0; i < bars.length; i++) {
		const bar = bars[i];
		if (x >= bar.x && x < bar.x + bar.width + config.barGap) {
			return i;
		}
	}

	return null;
}

/**
 * Create coordinate mapping functions
 */
export interface CoordinateMapper {
	valueToPixel: (value: number) => number;
	pixelToValue: (pixel: number) => number;
}

export function createCoordinateMapper(
	dataMin: number,
	dataMax: number,
	config: HistogramConfig
): CoordinateMapper {
	const chartWidth = config.width - config.padding.left - config.padding.right;

	return {
		valueToPixel: (value: number): number => {
			const ratio = (value - dataMin) / (dataMax - dataMin);
			return config.padding.left + ratio * chartWidth;
		},
		pixelToValue: (pixel: number): number => {
			const ratio = (pixel - config.padding.left) / chartWidth;
			return dataMin + ratio * (dataMax - dataMin);
		}
	};
}
