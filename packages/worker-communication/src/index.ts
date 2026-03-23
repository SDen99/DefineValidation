// packages/worker-communication/src/index.ts

// Export main classes and functions
export { WorkerPool, createWorkerPool } from './WorkerPool';

// Export all types
export type {
	WorkerTask,
	ManagedWorker,
	DatasetLoadingState,
	WorkerFactory,
	WorkerPoolConfig
} from './types';

// Re-export ProcessingResult from data-processing for convenience
export type { ProcessingResult } from '@sden99/data-processing/types';