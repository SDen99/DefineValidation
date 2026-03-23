/**
 * Virtualization type definitions for Data Table V2
 */

// Viewport configuration
export interface ViewportConfig {
  height: number; // Viewport height in pixels
  rowHeight: number; // Height of each row in pixels
  overscan: number; // Number of rows to render above/below visible area
  bufferSize?: number; // Additional buffer for smooth scrolling
}

// Visible window information
export interface VisibleWindow {
  startIndex: number; // First visible row index
  endIndex: number; // Last visible row index (exclusive)
  visibleCount: number; // Number of visible rows
  offsetY: number; // Vertical offset for positioning
}

// Scroll state
export interface ScrollState {
  scrollTop: number; // Current scroll position
  scrollHeight: number; // Total scrollable height
  clientHeight: number; // Viewport height
  scrollPercentage: number; // Scroll percentage (0-100)
}

// Virtualization metrics
export interface VirtualizationMetrics {
  totalRows: number;
  visibleRows: number;
  renderedRows: number; // Including overscan
  renderPercentage: number; // Percentage of rows rendered
  virtualizedPercentage: number; // Percentage of rows NOT rendered
  scrollTop: number;
  viewportHeight: number;
}

// Virtualization events
export interface VirtualizationEngineEvents {
  'window-changed': {
    window: VisibleWindow;
    metrics: VirtualizationMetrics;
  };
  'scroll-updated': {
    scrollState: ScrollState;
  };
}

// Performance configuration
export interface VirtualizationPerformance {
  enableSmoothing: boolean; // Smooth scroll transitions
  debounceMs: number; // Debounce scroll events
  preloadThreshold: number; // Rows to preload (as factor of visible)
}
