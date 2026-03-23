/**
 * VirtualizationEngine - Efficient row rendering for large datasets
 *
 * CRITICAL: NO SVELTE REACTIVITY! This must be plain JS/TS.
 * Uses EventEmitter pattern to notify listeners of changes.
 *
 * Handles:
 * - Visible row calculation based on scroll position
 * - Overscan management for smooth scrolling
 * - Performance optimization for 100K+ rows
 */

import { EventEmitter } from '../core/EventEmitter';
import type {
  ViewportConfig,
  VisibleWindow,
  ScrollState,
  VirtualizationMetrics,
  VirtualizationEngineEvents,
  VirtualizationPerformance
} from '../types/virtualization';

export class VirtualizationEngine {
  private config: ViewportConfig;
  private performance: VirtualizationPerformance;
  private totalRows: number = 0;
  private currentWindow: VisibleWindow;
  private currentScrollState: ScrollState;
  private eventBus: EventEmitter<VirtualizationEngineEvents>;

  // Debouncing
  private scrollTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    config: ViewportConfig,
    performance: VirtualizationPerformance = {
      enableSmoothing: true,
      debounceMs: 16, // ~60fps
      preloadThreshold: 1.5
    }
  ) {
    this.config = config;
    this.performance = performance;
    this.eventBus = new EventEmitter();

    // Initialize with empty window
    this.currentWindow = {
      startIndex: 0,
      endIndex: 0,
      visibleCount: 0,
      offsetY: 0
    };

    this.currentScrollState = {
      scrollTop: 0,
      scrollHeight: 0,
      clientHeight: config.height,
      scrollPercentage: 0
    };
  }

  /**
   * Set the total number of rows
   */
  setTotalRows(count: number): void {
    this.totalRows = count;
    this.recalculateWindow();
  }

  /**
   * Update viewport configuration
   */
  updateConfig(config: Partial<ViewportConfig>): void {
    this.config = { ...this.config, ...config };
    this.recalculateWindow();
  }

  /**
   * Handle scroll event
   */
  onScroll(scrollTop: number): void {
    // Debounce scroll events for performance
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Update scroll state immediately
    this.updateScrollState(scrollTop);

    // Debounce window recalculation
    if (this.performance.debounceMs > 0) {
      this.scrollTimeout = setTimeout(() => {
        this.recalculateWindow();
      }, this.performance.debounceMs);
    } else {
      this.recalculateWindow();
    }
  }

  /**
   * Update scroll state
   */
  private updateScrollState(scrollTop: number): void {
    const totalHeight = this.getTotalHeight();

    this.currentScrollState = {
      scrollTop,
      scrollHeight: totalHeight,
      clientHeight: this.config.height,
      scrollPercentage: totalHeight > 0
        ? (scrollTop / (totalHeight - this.config.height)) * 100
        : 0
    };

    this.eventBus.emit('scroll-updated', {
      scrollState: this.currentScrollState
    });
  }

  /**
   * Recalculate visible window
   */
  private recalculateWindow(): void {
    if (this.totalRows === 0) {
      this.currentWindow = {
        startIndex: 0,
        endIndex: 0,
        visibleCount: 0,
        offsetY: 0
      };
      this.emitWindowChanged();
      return;
    }

    const scrollTop = this.currentScrollState.scrollTop;
    const rowHeight = this.config.rowHeight;
    const viewportHeight = this.config.height;
    const overscan = this.config.overscan;

    // Calculate first visible row
    const firstVisibleRow = Math.floor(scrollTop / rowHeight);

    // Calculate number of visible rows
    const visibleRowCount = Math.ceil(viewportHeight / rowHeight);

    // Add overscan (symmetric on both sides)
    const startIndex = Math.max(0, firstVisibleRow - overscan);
    const endIndex = Math.min(
      this.totalRows,
      firstVisibleRow + visibleRowCount + overscan
    );

    // When at edges, try to maintain target window size by adding more overscan to the other side
    // But cap it to avoid over-rendering with large rowHeights
    const targetWindowSize = Math.min(
      visibleRowCount + (2 * overscan),
      visibleRowCount * 2 // Don't render more than 2x visible rows
    );
    const actualWindowSize = endIndex - startIndex;
    if (actualWindowSize < targetWindowSize && endIndex < this.totalRows) {
      // We're at the top, add more to the bottom
      const deficit = targetWindowSize - actualWindowSize;
      const newEndIndex = Math.min(this.totalRows, endIndex + deficit);
      this.currentWindow = {
        startIndex,
        endIndex: newEndIndex,
        visibleCount: newEndIndex - startIndex,
        offsetY: startIndex * rowHeight
      };
      this.emitWindowChanged();
      return;
    } else if (actualWindowSize < targetWindowSize && startIndex > 0) {
      // We're at the bottom, add more to the top
      const deficit = targetWindowSize - actualWindowSize;
      const newStartIndex = Math.max(0, startIndex - deficit);
      this.currentWindow = {
        startIndex: newStartIndex,
        endIndex,
        visibleCount: endIndex - newStartIndex,
        offsetY: newStartIndex * rowHeight
      };
      this.emitWindowChanged();
      return;
    }

    // Calculate offset for positioning
    const offsetY = startIndex * rowHeight;

    this.currentWindow = {
      startIndex,
      endIndex,
      visibleCount: endIndex - startIndex,
      offsetY
    };

    this.emitWindowChanged();
  }

  /**
   * Get current visible window
   */
  getVisibleWindow(): VisibleWindow {
    return { ...this.currentWindow };
  }

  /**
   * Get current scroll state
   */
  getScrollState(): ScrollState {
    return { ...this.currentScrollState };
  }

  /**
   * Get total scrollable height
   */
  getTotalHeight(): number {
    return this.totalRows * this.config.rowHeight;
  }

  /**
   * Get virtualization metrics
   */
  getMetrics(): VirtualizationMetrics {
    const visibleCount = Math.ceil(this.config.height / this.config.rowHeight);
    const renderedCount = this.currentWindow.visibleCount;

    return {
      totalRows: this.totalRows,
      visibleRows: visibleCount,
      renderedRows: renderedCount,
      renderPercentage: this.totalRows > 0
        ? (renderedCount / this.totalRows) * 100
        : 0,
      virtualizedPercentage: this.totalRows > 0
        ? ((this.totalRows - renderedCount) / this.totalRows) * 100
        : 0,
      scrollTop: this.currentScrollState.scrollTop,
      viewportHeight: this.config.height
    };
  }

  /**
   * Scroll to a specific row
   */
  scrollToRow(rowIndex: number, alignment: 'start' | 'center' | 'end' = 'start'): number {
    const rowHeight = this.config.rowHeight;
    const viewportHeight = this.config.height;

    let scrollTop: number;

    switch (alignment) {
      case 'center':
        scrollTop = (rowIndex * rowHeight) - (viewportHeight / 2) + (rowHeight / 2);
        break;
      case 'end':
        scrollTop = (rowIndex * rowHeight) - viewportHeight + rowHeight;
        break;
      case 'start':
      default:
        scrollTop = rowIndex * rowHeight;
    }

    // Constrain to valid scroll range
    const maxScroll = this.getTotalHeight() - viewportHeight;
    scrollTop = Math.max(0, Math.min(scrollTop, maxScroll));

    this.onScroll(scrollTop);
    return scrollTop;
  }

  /**
   * Scroll to top
   */
  scrollToTop(): number {
    return this.scrollToRow(0, 'start');
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom(): number {
    return this.scrollToRow(this.totalRows - 1, 'end');
  }

  /**
   * Check if a row is currently visible
   */
  isRowVisible(rowIndex: number): boolean {
    return rowIndex >= this.currentWindow.startIndex &&
           rowIndex < this.currentWindow.endIndex;
  }

  /**
   * Get row offset (for positioning)
   */
  getRowOffset(rowIndex: number): number {
    return rowIndex * this.config.rowHeight;
  }

  /**
   * Estimate memory usage
   */
  estimateMemoryUsage(): {
    totalRows: number;
    renderedRows: number;
    memorySavings: string;
  } {
    const totalRows = this.totalRows;
    const renderedRows = this.currentWindow.visibleCount;
    const savingsPercent = totalRows > 0
      ? ((totalRows - renderedRows) / totalRows) * 100
      : 0;

    return {
      totalRows,
      renderedRows,
      memorySavings: `${savingsPercent.toFixed(1)}%`
    };
  }

  /**
   * Emit window-changed event
   */
  private emitWindowChanged(): void {
    this.eventBus.emit('window-changed', {
      window: this.currentWindow,
      metrics: this.getMetrics()
    });
  }

  /**
   * Subscribe to virtualization events
   */
  on<K extends keyof VirtualizationEngineEvents>(
    event: K,
    handler: (data: VirtualizationEngineEvents[K]) => void
  ): () => void {
    return this.eventBus.on(event, handler);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
  }
}
