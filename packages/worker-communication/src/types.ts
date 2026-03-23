// packages/worker-communication/src/types.ts
import type { ProcessingResult } from '@sden99/data-processing/types';

export interface WorkerTask {
	id: string;
	file: ArrayBuffer;
	fileName: string;
	onProgress: (state: DatasetLoadingState) => void;
	resolve: (result: ProcessingResult) => void;
	reject: (error: Error) => void;
}

export interface ManagedWorker {
	worker: Worker;
	busy: boolean;
	lastUsed: number;
	pyodideReady: boolean;
}

export interface DatasetLoadingState {
	status: 'processing' | 'complete' | 'error';
	fileName: string;
	progress: number;
	totalSize: number;
	loadedSize: number;
	error?: string;
	processingTime?: number;
}

export interface WorkerFactory {
	(): Worker;
}

export interface WorkerPoolConfig {
	maxWorkers?: number;
	idleTimeout?: number;
	workerFactory: WorkerFactory;
}