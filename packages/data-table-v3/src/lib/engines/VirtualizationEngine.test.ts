import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VirtualizationEngine } from './VirtualizationEngine';
import type { ViewportConfig } from '../types/virtualization';

describe('VirtualizationEngine', () => {
	let engine: VirtualizationEngine;
	let config: ViewportConfig;

	beforeEach(() => {
		config = {
			height: 600,
			rowHeight: 40,
			overscan: 5
		};
		engine = new VirtualizationEngine(config, {
			enableSmoothing: false,
			debounceMs: 0, // No debouncing for tests
			preloadThreshold: 1
		});
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	describe('Initialization', () => {
		it('should initialize with empty window', () => {
			const window = engine.getVisibleWindow();

			expect(window).toEqual({
				startIndex: 0,
				endIndex: 0,
				visibleCount: 0,
				offsetY: 0
			});
		});

		it('should calculate initial window after setTotalRows', () => {
			engine.setTotalRows(1000);
			const window = engine.getVisibleWindow();

			expect(window.startIndex).toBe(0);
			expect(window.endIndex).toBeGreaterThan(0);
			expect(window.visibleCount).toBeGreaterThan(0);
		});
	});

	describe('Window Calculation', () => {
		it('should calculate visible rows based on viewport height', () => {
			engine.setTotalRows(1000);
			const window = engine.getVisibleWindow();

			// Height: 600px, rowHeight: 40px
			// Visible rows: 600 / 40 = 15 rows
			// With overscan: 15 + (2 * 5) = 25 rows
			expect(window.visibleCount).toBeGreaterThanOrEqual(15);
			expect(window.visibleCount).toBeLessThanOrEqual(25);
		});

		it('should include overscan rows', () => {
			const configWithOverscan: ViewportConfig = {
				height: 400,
				rowHeight: 40,
				overscan: 3
			};

			engine = new VirtualizationEngine(configWithOverscan, {
				enableSmoothing: false,
				debounceMs: 0,
				preloadThreshold: 1
			});

			engine.setTotalRows(1000);
			const window = engine.getVisibleWindow();

			// Visible rows: 400 / 40 = 10
			// With overscan: 10 + (2 * 3) = 16
			expect(window.visibleCount).toBe(16);
		});

		it('should handle fewer rows than viewport height', () => {
			engine.setTotalRows(5);
			const window = engine.getVisibleWindow();

			// Only 5 rows total, should show all
			expect(window.startIndex).toBe(0);
			expect(window.endIndex).toBe(5);
			expect(window.visibleCount).toBe(5);
		});

		it('should handle zero rows', () => {
			engine.setTotalRows(0);
			const window = engine.getVisibleWindow();

			expect(window.startIndex).toBe(0);
			expect(window.endIndex).toBe(0);
			expect(window.visibleCount).toBe(0);
		});
	});

	describe('Scrolling', () => {
		beforeEach(() => {
			engine.setTotalRows(1000);
		});

		it('should update window on scroll', () => {
			const initialWindow = engine.getVisibleWindow();

			// Scroll down by 10 rows (400px)
			engine.onScroll(400);
			const newWindow = engine.getVisibleWindow();

			expect(newWindow.startIndex).toBeGreaterThan(initialWindow.startIndex);
			expect(newWindow.offsetY).toBe(newWindow.startIndex * 40);
		});

		it('should calculate correct offsetY', () => {
			engine.onScroll(800);
			const window = engine.getVisibleWindow();

			// Offset should match scroll position aligned to row height
			expect(window.offsetY).toBeGreaterThanOrEqual(0);
			expect(window.offsetY).toBeLessThanOrEqual(800);
		});

		it('should handle scroll to bottom', () => {
			// Total height: 1000 rows * 40px = 40000px
			// Viewport height: 600px
			// Max scroll: 40000 - 600 = 39400px
			engine.onScroll(39400);
			const window = engine.getVisibleWindow();

			// Should show last rows
			expect(window.endIndex).toBe(1000);
		});

		it('should handle scroll to top', () => {
			// Scroll to middle first
			engine.onScroll(5000);

			// Then scroll back to top
			engine.onScroll(0);
			const window = engine.getVisibleWindow();

			expect(window.startIndex).toBe(0);
			expect(window.offsetY).toBe(0);
		});

		it('should emit window-changed event on scroll', () => {
			const handler = vi.fn();
			engine.on('window-changed', handler);

			engine.onScroll(400);

			expect(handler).toHaveBeenCalled();
			expect(handler).toHaveBeenCalledWith(
				expect.objectContaining({
					window: expect.any(Object)
				})
			);
		});
	});

	describe('Config Updates', () => {
		beforeEach(() => {
			engine.setTotalRows(1000);
		});

		it('should recalculate window when height changes', () => {
			const initialWindow = engine.getVisibleWindow();

			engine.updateConfig({ height: 800 });
			const newWindow = engine.getVisibleWindow();

			// Taller viewport = more visible rows
			expect(newWindow.visibleCount).toBeGreaterThan(initialWindow.visibleCount);
		});

		it('should recalculate window when rowHeight changes', () => {
			const initialWindow = engine.getVisibleWindow();

			engine.updateConfig({ rowHeight: 60 });
			const newWindow = engine.getVisibleWindow();

			// Taller rows = fewer visible rows
			expect(newWindow.visibleCount).toBeLessThan(initialWindow.visibleCount);
		});

		it('should recalculate window when overscan changes', () => {
			const initialWindow = engine.getVisibleWindow();

			engine.updateConfig({ overscan: 10 });
			const newWindow = engine.getVisibleWindow();

			// More overscan = more total rows
			expect(newWindow.visibleCount).toBeGreaterThan(initialWindow.visibleCount);
		});

		it('should preserve scroll position when config changes', () => {
			engine.onScroll(2000);
			const scrolledWindow = engine.getVisibleWindow();

			engine.updateConfig({ overscan: 10 });
			const newWindow = engine.getVisibleWindow();

			// Start index should be similar (accounting for overscan difference)
			expect(Math.abs(newWindow.startIndex - scrolledWindow.startIndex)).toBeLessThanOrEqual(5);
		});
	});

	describe('Edge Cases', () => {
		it('should handle single row', () => {
			engine.setTotalRows(1);
			const window = engine.getVisibleWindow();

			expect(window.startIndex).toBe(0);
			expect(window.endIndex).toBe(1);
			expect(window.visibleCount).toBe(1);
		});

		it('should handle very large datasets (100K rows)', () => {
			engine.setTotalRows(100000);
			const window = engine.getVisibleWindow();

			// Should still only render visible window
			expect(window.visibleCount).toBeLessThan(50);
			expect(window.endIndex).toBeLessThan(100);
		});

		it('should handle very small rowHeight', () => {
			engine.updateConfig({ rowHeight: 10 });
			engine.setTotalRows(1000);
			const window = engine.getVisibleWindow();

			// Height: 600px, rowHeight: 10px = 60 visible rows
			expect(window.visibleCount).toBeGreaterThanOrEqual(60);
		});

		it('should handle very large rowHeight', () => {
			engine.updateConfig({ rowHeight: 200 });
			engine.setTotalRows(1000);
			const window = engine.getVisibleWindow();

			// Height: 600px, rowHeight: 200px = 3 visible rows
			expect(window.visibleCount).toBeLessThanOrEqual(10);
		});

		it('should handle negative scroll (boundary check)', () => {
			engine.setTotalRows(1000);
			engine.onScroll(-100); // Invalid negative scroll

			const window = engine.getVisibleWindow();
			expect(window.startIndex).toBeGreaterThanOrEqual(0);
			expect(window.offsetY).toBeGreaterThanOrEqual(0);
		});

		it('should handle excessive scroll (beyond content)', () => {
			engine.setTotalRows(100);
			// Total height: 100 * 40 = 4000px
			// Scroll way beyond
			engine.onScroll(100000);

			const window = engine.getVisibleWindow();
			expect(window.endIndex).toBeLessThanOrEqual(100);
		});
	});

	describe('Event System', () => {
		beforeEach(() => {
			engine.setTotalRows(1000);
		});

		it('should allow subscribing to window-changed events', () => {
			const handler = vi.fn();
			const unsubscribe = engine.on('window-changed', handler);

			engine.onScroll(400);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(typeof unsubscribe).toBe('function');
		});

		it('should allow unsubscribing from events', () => {
			const handler = vi.fn();
			const unsubscribe = engine.on('window-changed', handler);

			engine.onScroll(400);
			expect(handler).toHaveBeenCalledTimes(1);

			unsubscribe();
			engine.onScroll(800);

			// Should not be called again
			expect(handler).toHaveBeenCalledTimes(1);
		});

		it('should emit metrics with event', () => {
			const handler = vi.fn();
			engine.on('window-changed', handler);

			engine.onScroll(400);

			expect(handler).toHaveBeenCalledWith(
				expect.objectContaining({
					window: expect.objectContaining({
						startIndex: expect.any(Number),
						endIndex: expect.any(Number),
						visibleCount: expect.any(Number),
						offsetY: expect.any(Number)
					})
				})
			);
		});
	});

	describe('Performance', () => {
		it('should debounce rapid scroll events', async () => {
			engine = new VirtualizationEngine(config, {
				enableSmoothing: true,
				debounceMs: 50,
				preloadThreshold: 1
			});

			engine.setTotalRows(1000);
			const handler = vi.fn();
			engine.on('window-changed', handler);

			// Rapid scrolls
			engine.onScroll(100);
			engine.onScroll(200);
			engine.onScroll(300);

			// Should debounce
			await new Promise(resolve => setTimeout(resolve, 100));

			// Should have been called fewer times than scroll calls
			expect(handler.mock.calls.length).toBeLessThan(3);
		});

		it('should efficiently handle window calculations', () => {
			engine.setTotalRows(100000);

			const start = performance.now();
			engine.onScroll(50000);
			const end = performance.now();

			// Should calculate in < 10ms even for 100K rows
			expect(end - start).toBeLessThan(10);
		});
	});

	describe('Metrics', () => {
		beforeEach(() => {
			engine.setTotalRows(1000);
		});

		it('should provide current metrics', () => {
			engine.onScroll(2000);
			const metrics = engine.getMetrics();

			expect(metrics).toMatchObject({
				totalRows: 1000,
				renderedRows: expect.any(Number),
				renderPercentage: expect.any(Number)
			});
		});

		it('should calculate render percentage correctly', () => {
			engine.setTotalRows(1000);
			const metrics = engine.getMetrics();

			// Rendering ~25 rows out of 1000 = ~2.5%
			expect(metrics.renderPercentage).toBeGreaterThan(0);
			expect(metrics.renderPercentage).toBeLessThan(10);
		});

		it('should report 100% for small datasets', () => {
			engine.setTotalRows(5);
			const metrics = engine.getMetrics();

			// All 5 rows rendered = 100%
			expect(metrics.renderPercentage).toBe(100);
		});
	});
});
