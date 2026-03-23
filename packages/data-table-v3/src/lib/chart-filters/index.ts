/**
 * Chart Filters - Visual filter components for data tables
 */

// Types
export {
	type ColumnType,
	type CodelistItem,
	type ColumnMetadata,
	type CategoricalDistribution,
	type CategoricalItem,
	type CategoricalOptions,
	type NumericalDistribution,
	type NumericalBin,
	type NumericalStats,
	type NumericalOptions,
	type DateDistribution,
	type DateBin,
	type DateGranularity,
	type DateOptions,
	type Distribution,
	type DefineVariable,
	type DatasetDetails,
	type DistributionOptions
} from './types';

// Metadata resolution
export { resolveColumnMetadata, resolveAllColumnMetadata } from './metadata';

// Distribution calculations (individual)
export { calculateCategoricalDistribution } from './categorical';
export { calculateNumericalDistribution } from './numerical';
export { calculateDateDistribution } from './date';

// Main distribution API
export {
	calculateDistribution,
	calculateAllDistributions,
	recalculateDistributionsForCrossFilter
} from './orchestration';

// Brush interaction logic
export {
	computeBinEdges,
	snapToNearestEdge,
	constrainToChart,
	hitTest,
	calculateDragPosition,
	isBrushTooSmall,
	getCursorForDragMode,
	type BrushConfig,
	type BinEdges,
	type DragMode,
	type HitTestResult
} from './BrushEngine';

// Histogram rendering
export {
	setupCanvas,
	computeBarGeometry,
	renderHistogram,
	renderAxisLabels,
	findBinAtPosition,
	createCoordinateMapper,
	type Bin,
	type HistogramColors,
	type HistogramConfig,
	type HistogramRenderState,
	type BarGeometry,
	type CoordinateMapper
} from './HistogramRenderer';
