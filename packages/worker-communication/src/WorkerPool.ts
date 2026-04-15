// packages/worker-communication/src/WorkerPool.ts
import type { WorkerTask, ManagedWorker, DatasetLoadingState, WorkerPoolConfig } from './types';
import type { ProcessingResult } from '@sden99/data-processing/types';

// Helper to safely get hardware concurrency
const getDefaultWorkerCount = () => {
	if (typeof window !== 'undefined' && 'navigator' in window) {
		return Math.max(1, navigator.hardwareConcurrency - 1);
	}
	return 2; // Default fallback for SSR
};

export function createWorkerPool(config: WorkerPoolConfig): WorkerPool | null {
	if (typeof window === 'undefined') {
		return null;
	}
	return new WorkerPool(config);
}

export class WorkerPool {
	private workers: ManagedWorker[] = [];
	private taskQueue: WorkerTask[] = [];
	private maxWorkers: number;
	private idleTimeout: number;
	private isInitialized: boolean = false;
	private workerFactory: () => Worker;

	constructor(config: WorkerPoolConfig) {
		this.maxWorkers = config.maxWorkers ?? getDefaultWorkerCount();
		this.idleTimeout = config.idleTimeout ?? 30000;
		this.workerFactory = config.workerFactory;
		this.isInitialized = false;
	}

	public async initialize(): Promise<void> {
		if (this.isInitialized || typeof window === 'undefined') {
			return;
		}

		// Set up cleanup interval only in browser context
		setInterval(() => this.cleanupIdleWorkers(), 10000);
		this.isInitialized = true;
	}

	private createWorker(): Promise<ManagedWorker> {
		if (typeof window === 'undefined') {
			return Promise.reject(new Error('Cannot create worker in SSR context'));
		}

		return new Promise((resolve, reject) => {
			try {
				const worker = this.workerFactory();

				const managedWorker: ManagedWorker = {
					worker,
					busy: false,
					lastUsed: Date.now(),
					pyodideReady: false
				};

				const initListener = (e: MessageEvent) => {
					if (e.data.type === 'PYODIDE_READY') {
						managedWorker.pyodideReady = true;
						worker.removeEventListener('message', initListener);
						resolve(managedWorker);
					} else if (e.data.type === 'PYODIDE_ERROR') {
						worker.removeEventListener('message', initListener);
						reject(new Error(e.data.error));
					}
				};

				worker.addEventListener('message', initListener);
				worker.addEventListener('error', (error) => {
					console.error('Worker creation error:', error);
					reject(error);
				});

				worker.onmessage = (e) => this.handleWorkerMessage(e, managedWorker);
			} catch (error) {
				console.error('Failed to create worker:', error);
				reject(error);
			}
		});
	}

	private async getAvailableWorker(): Promise<ManagedWorker> {
		// First, try to find an existing available worker
		let worker = this.workers.find((w) => !w.busy && w.pyodideReady);

		if (!worker && this.workers.length < this.maxWorkers) {
			// Create a new worker if we haven't reached the limit
			try {
				worker = await this.createWorker();
				this.workers.push(worker);
			} catch (error) {
				console.error('Failed to create worker:', error);
				throw error;
			}
		}

		if (!worker) {
			// Wait for a worker to become available
			return new Promise((resolve) => {
				const checkInterval = setInterval(() => {
					const availableWorker = this.workers.find((w) => !w.busy && w.pyodideReady);
					if (availableWorker) {
						clearInterval(checkInterval);
						resolve(availableWorker);
					}
				}, 100);
			});
		}

		return worker;
	}

	private handleWorkerError(e: ErrorEvent, managedWorker: ManagedWorker) {
		console.error('Worker error:', e);
		managedWorker.busy = false;
		// Don't process next task immediately after an error
		// Let the error propagate first
	}

	private async processNextTask() {
		if (this.taskQueue.length === 0) return;

		try {
			const worker = await this.getAvailableWorker();
			const task = this.taskQueue[0];

			worker.busy = true;
			worker.lastUsed = Date.now();

			worker.worker.postMessage({
				type: 'PROCESS_FILE',
				taskId: task.id,
				file: task.file,
				fileName: task.fileName
			});
		} catch (error) {
			console.error('Failed to process task:', error);
			// Handle task failure
			const task = this.taskQueue[0];
			if (task) {
				task.reject(error as Error);
				this.taskQueue.shift();
			}
		}
	}

	private cleanupIdleWorkers() {
		const now = Date.now();
		this.workers = this.workers.filter((worker) => {
			if (!worker.busy && now - worker.lastUsed > this.idleTimeout) {
				worker.worker.terminate();
				return false;
			}
			return true;
		});
	}

	private handleWorkerMessage(e: MessageEvent, managedWorker: ManagedWorker) {
		const task = this.taskQueue.find((t) => t.id === e.data.taskId);
		if (!task) return;

		if (e.data.type === 'PROGRESS') {
			// Forward progress from worker to the task's callback (50-95% range)
			task.onProgress({
				status: 'processing',
				fileName: task.fileName,
				progress: e.data.progress,
				totalSize: 0,
				loadedSize: 0
			});
			return;
		}

		if (e.data.type === 'PROCESSING_COMPLETE') {
			task.resolve(e.data.result);
		} else if (e.data.type === 'PROCESSING_ERROR') {
			task.reject(new Error(e.data.error));
		}

		managedWorker.busy = false;
		managedWorker.lastUsed = Date.now();
		this.taskQueue = this.taskQueue.filter((t) => t.id !== e.data.taskId);
		this.processNextTask();
	}

	public async processFile(
		file: File,
		fileName: string,
		progressCallback: (state: DatasetLoadingState) => void
	): Promise<ProcessingResult> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		return new Promise((resolve, reject) => {
			const task: WorkerTask = {
				id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				file: null as any, // Will be set after file reading
				fileName,
				onProgress: progressCallback,
				resolve,
				reject
			};

			// Start reading the file with progress tracking
			const reader = new FileReader();
			let loadingState: DatasetLoadingState = {
				progress: 0,
				fileName,
				totalSize: file.size,
				loadedSize: 0,
				status: 'processing'
			};

			reader.onprogress = (event) => {
				if (event.lengthComputable) {
					loadingState = {
						...loadingState,
						loadedSize: event.loaded,
						progress: (event.loaded / event.total) * 50 // First 50% is loading
					};
					progressCallback(loadingState);
				}
			};

			reader.onload = async (e) => {
				task.file = e.target?.result as ArrayBuffer;
				loadingState = {
					...loadingState,
					status: 'processing',
					progress: 50 // Start processing at 50%
				};
				progressCallback(loadingState);

				this.taskQueue.push(task);
				this.processNextTask();
			};

			reader.onerror = () => {
				reject(new Error('Failed to read file'));
			};

			reader.readAsArrayBuffer(file);
		});
	}

	public dispose(): Promise<void> {
		this.workers.forEach((worker) => {
			worker.worker.terminate();
		});
		this.workers = [];
		this.taskQueue = [];
		this.isInitialized = false;
		return Promise.resolve();
	}
}