/**
 * BrushEngine - Pure logic for brush interactions
 *
 * No Svelte dependencies - fully testable
 */

export interface BrushConfig {
	chartLeft: number;
	chartRight: number;
	handleHitArea: number;
	minBrushWidth: number;
}

export interface BinEdges {
	pixels: number[];
	values: number[];
}

export type DragMode = 'create' | 'move' | 'resize-left' | 'resize-right' | null;

export interface HitTestResult {
	mode: DragMode;
	cursor: string;
}

/**
 * Precompute bin edges for snapping (call once when bins change)
 */
export function computeBinEdges(
	bins: Array<{ x0: number; x1: number }>,
	valueToPixel: (value: number) => number
): BinEdges {
	const pixels: number[] = [];
	const values: number[] = [];

	for (const bin of bins) {
		pixels.push(valueToPixel(bin.x0));
		values.push(bin.x0);
	}

	// Add the right edge of the last bin
	if (bins.length > 0) {
		const lastBin = bins[bins.length - 1];
		pixels.push(valueToPixel(lastBin.x1));
		values.push(lastBin.x1);
	}

	return { pixels, values };
}

/**
 * Snap a pixel position to the nearest bin edge
 */
export function snapToNearestEdge(pixel: number, binEdges: BinEdges, enabled: boolean): number {
	if (!enabled || binEdges.pixels.length === 0) return pixel;

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

/**
 * Constrain a pixel position to chart bounds
 */
export function constrainToChart(pixel: number, config: BrushConfig): number {
	return Math.max(config.chartLeft, Math.min(config.chartRight, pixel));
}

/**
 * Hit test: determine what the user is clicking on
 */
export function hitTest(
	x: number,
	brushStart: number | null,
	brushEnd: number | null,
	config: BrushConfig
): HitTestResult {
	if (brushStart === null || brushEnd === null) {
		return { mode: 'create', cursor: 'crosshair' };
	}

	const left = Math.min(brushStart, brushEnd);
	const right = Math.max(brushStart, brushEnd);

	// Left handle
	if (Math.abs(x - left) < config.handleHitArea) {
		return { mode: 'resize-left', cursor: 'ew-resize' };
	}

	// Right handle
	if (Math.abs(x - right) < config.handleHitArea) {
		return { mode: 'resize-right', cursor: 'ew-resize' };
	}

	// Inside brush
	if (x > left && x < right) {
		return { mode: 'move', cursor: 'grab' };
	}

	// Outside - create new
	return { mode: 'create', cursor: 'crosshair' };
}

/**
 * Calculate new brush position during drag
 */
export function calculateDragPosition(
	mode: DragMode,
	currentX: number,
	dragStartX: number,
	initialStart: number,
	initialEnd: number,
	config: BrushConfig,
	binEdges: BinEdges,
	snapEnabled: boolean
): { start: number; end: number } | null {
	const constrainedX = constrainToChart(currentX, config);

	switch (mode) {
		case 'create': {
			const snappedEnd = snapToNearestEdge(constrainedX, binEdges, snapEnabled);
			return { start: initialStart, end: snappedEnd };
		}

		case 'move': {
			const delta = currentX - dragStartX;
			let newStart = initialStart + delta;
			let newEnd = initialEnd + delta;
			const brushWidth = Math.abs(initialEnd - initialStart);

			// Constrain to chart bounds
			if (newStart < config.chartLeft) {
				newStart = config.chartLeft;
				newEnd = newStart + brushWidth;
			}
			if (newEnd > config.chartRight) {
				newEnd = config.chartRight;
				newStart = newEnd - brushWidth;
			}

			// Snap left edge, maintain width
			if (snapEnabled) {
				const snappedStart = snapToNearestEdge(newStart, binEdges, true);
				const snapDelta = snappedStart - newStart;
				newStart = snappedStart;
				newEnd = newEnd + snapDelta;

				// Re-constrain after snapping
				if (newEnd > config.chartRight) {
					newEnd = config.chartRight;
					newStart = newEnd - brushWidth;
				}
			}

			return { start: newStart, end: newEnd };
		}

		case 'resize-left': {
			const snappedStart = snapToNearestEdge(constrainedX, binEdges, snapEnabled);
			if (Math.abs(initialEnd - snappedStart) >= config.minBrushWidth) {
				return { start: snappedStart, end: initialEnd };
			}
			return null; // No change - would be too small
		}

		case 'resize-right': {
			const snappedEnd = snapToNearestEdge(constrainedX, binEdges, snapEnabled);
			if (Math.abs(snappedEnd - initialStart) >= config.minBrushWidth) {
				return { start: initialStart, end: snappedEnd };
			}
			return null; // No change - would be too small
		}

		default:
			return null;
	}
}

/**
 * Check if brush is too small and should be cleared
 */
export function isBrushTooSmall(
	start: number | null,
	end: number | null,
	minWidth: number
): boolean {
	if (start === null || end === null) return false;
	return Math.abs(end - start) < minWidth;
}

/**
 * Get cursor style for current drag mode
 */
export function getCursorForDragMode(mode: DragMode, isDragging: boolean): string {
	if (!isDragging) return 'crosshair';

	switch (mode) {
		case 'move':
			return 'grabbing';
		case 'resize-left':
		case 'resize-right':
			return 'ew-resize';
		default:
			return 'crosshair';
	}
}
