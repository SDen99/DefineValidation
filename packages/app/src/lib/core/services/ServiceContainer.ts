// packages/app/src/lib/core/services/ServiceContainer.ts
import { DatasetService } from '$lib/core/services/datasetService';
import { createWorkerPool, WorkerPool } from '$lib/core/services/workerPool';
import type { ServiceContainer as ServiceContainerType } from '$lib/core/types/types';

export class ServiceContainerImpl implements ServiceContainerType {
	private static instance: ServiceContainerImpl | null = null;
	private datasetService: DatasetService | null = null;
	private isDisposed: boolean = false;
	private workerPool: WorkerPool | null = null;

	private constructor() {}

	public static async initialize(): Promise<ServiceContainerImpl> {
		console.log('🟡 ServiceContainer.initialize() started');

		if (!ServiceContainerImpl.instance) {
			console.log('🟡 Creating new ServiceContainer instance');
			const container = new ServiceContainerImpl();

			try {
				// Initialize dataset service
				console.log('🟡 Initializing dataset service...');
				container.datasetService = DatasetService.getInstance();
				await container.datasetService.initialize();
				console.log('🟢 Dataset service initialized');

				// Initialize worker pool
				console.log('🟡 Initializing worker pool...');
				container.workerPool = createWorkerPool();
				if (container.workerPool) {
					await container.workerPool.initialize();
					console.log('🟢 Worker pool initialized');
				} else {
					console.warn('⚠️ Worker pool not available (SSR context?)');
				}

				// Verify all critical services
				if (!container.datasetService) {
					throw new Error('Dataset service failed to initialize');
				}
				// WorkerPool is optional for SSR contexts

				ServiceContainerImpl.instance = container;
				console.log('🟢 ServiceContainer initialization complete');
				return ServiceContainerImpl.instance;
			} catch (error) {
				console.error('🔴 Error during ServiceContainer initialization:', error);
				throw error;
			}
		}

		console.log('🟢 Returning existing ServiceContainer instance');
		return ServiceContainerImpl.instance;
	}

	public getWorkerPool(): WorkerPool {
		this.throwIfDisposed();
		if (!this.workerPool) {
			// For environments where WorkerPool isn't available (SSR),
			// throw a more descriptive error
			throw new Error('Worker pool not available in current context');
		}
		return this.workerPool;
	}

	public getDatasetService(): DatasetService {
		this.throwIfDisposed();
		if (!this.datasetService) {
			throw new Error('Dataset service not initialized');
		}
		return this.datasetService;
	}

	private throwIfDisposed(): void {
		if (this.isDisposed) {
			throw new Error('Service container has been disposed');
		}
	}

	private clearSubscriptions(): void {
		// Clear any event listeners or subscriptions if needed
	}

	public async dispose(): Promise<void> {
		if (this.isDisposed) {
			return;
		}

		try {
			// Terminate worker pool
			if (this.workerPool) {
				await this.workerPool.dispose();
				this.workerPool = null;
			}

			// Clean up dataset service (no dispose method needed)
			if (this.datasetService) {
				this.datasetService = null;
			}

			// Clear any event listeners or subscriptions
			this.clearSubscriptions();
		} catch (error) {
			console.error('Error during service container disposal:', error);
		} finally {
			this.isDisposed = true;
			ServiceContainerImpl.instance = null; // Clear singleton instance
		}
	}
}

export { ServiceContainerImpl as ServiceContainer };
