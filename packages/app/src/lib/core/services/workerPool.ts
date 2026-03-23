// packages/app/src/lib/core/services/workerPool.ts
import {
	createWorkerPool as createBaseWorkerPool,
	type WorkerPoolConfig,
	type WorkerPool
} from '@sden99/worker-communication';
import FileProcessorWorker from '../processors/sas7bdat/sas7bdat.worker.js?worker';

// Re-export types for backward compatibility
export type {
	WorkerTask,
	ManagedWorker,
	DatasetLoadingState,
	ProcessingResult
} from '@sden99/worker-communication';

// Export the WorkerPool class
export { WorkerPool } from '@sden99/worker-communication';

// Factory function that provides the specific worker for this app
export function createFileProcessorWorkerPool(maxWorkers?: number): WorkerPool | null {
	const config: WorkerPoolConfig = {
		maxWorkers,
		workerFactory: () => new FileProcessorWorker()
	};
	return createBaseWorkerPool(config);
}

// Legacy function for backward compatibility
export function createWorkerPool(maxWorkers?: number): WorkerPool | null {
	return createFileProcessorWorkerPool(maxWorkers);
}
