import type { EnhancedDefineXMLData, GraphData } from '@sden99/data-processing';
export class DatasetService {
	public static async create(): Promise<DatasetService> {
		const service = new DatasetService();
		await service.initialize();
		return service;
	}
	private static instance: DatasetService;
	private readonly dbName = 'SasDataViewer';
	private readonly version = 1;
	private db: IDBDatabase | null = null;

	private constructor() {}

	public static getInstance(): DatasetService {
		if (!DatasetService.instance) {
			DatasetService.instance = new DatasetService();
		}
		return DatasetService.instance;
	}

	public async initialize(): Promise<void> {
		if (this.db) {
			// --- DEBUG ---
			console.log('DB_SVC: Initialize called, but DB connection already exists.');
			return;
		}

		return new Promise((resolve, reject) => {
			// --- DEBUG ---
			console.log(`DB_SVC: Opening IndexedDB connection to "${this.dbName}"...`);
			const request = indexedDB.open(this.dbName, this.version);

			request.onerror = () => {
				// --- DEBUG ---
				console.error('DB_SVC: IndexedDB connection error.', request.error);
				reject(new Error('Failed to open database'));
			};

			request.onsuccess = (event) => {
				this.db = (event.target as IDBOpenDBRequest).result;
				// --- DEBUG ---
				console.log('DB_SVC: IndexedDB connection SUCCESSFUL.');
				resolve();
			};

			request.onupgradeneeded = (event) => {
				// --- DEBUG ---
				console.log('DB_SVC: onupgradeneeded event triggered.');
				const db = (event.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains('datasets')) {
					db.createObjectStore('datasets', { keyPath: 'fileName' });
				}
			};
		});
	}

	private async transaction<T>(
		mode: IDBTransactionMode,
		callback: (store: IDBObjectStore) => IDBRequest<T>
	): Promise<T> {
		if (!this.db) throw new Error('Database not initialized');

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction('datasets', mode);
			const store = transaction.objectStore('datasets');
			const request = callback(store);

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	public async addDataset(dataset: {
		fileName: string;
		data: any;
		details?: {
			num_rows: number;
			num_columns: number;
			columns: string[];
			dtypes: Record<string, string>;
			summary: Record<string, any>;
		};
		graphData?: GraphData | null;
		enhancedDefineXML?: EnhancedDefineXMLData | null;
		processingTime?: number;
		processingStats?: any;
		ADaM?: boolean;
		SDTM?: boolean;
	}): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction('datasets', 'readwrite');

			// Add transaction error handling
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(new Error('Transaction aborted'));

			const store = transaction.objectStore('datasets');

			// Check if dataset already exists
			const getRequest = store.get(dataset.fileName);

			getRequest.onsuccess = () => {
				// Prepare the dataset with all needed properties
				const datasetToStore = {
					...dataset,
					// Add a timestamp if not present
					timestamp: Date.now()
				};

				// Log information about graph data if present
				if (dataset.graphData) {
					console.log(`[DatasetService] Dataset ${dataset.fileName} includes graph data:`, {
						nodeCount: dataset.graphData.nodes.length,
						linkCount: dataset.graphData.links.length
					});
				}

				if (getRequest.result) {
					// If exists, update it
					const putRequest = store.put(datasetToStore);
					putRequest.onsuccess = () => resolve();
					putRequest.onerror = () => reject(putRequest.error);
				} else {
					// If new, add it
					const addRequest = store.add(datasetToStore);
					addRequest.onsuccess = () => resolve();
					addRequest.onerror = () => reject(addRequest.error);
				}
			};

			getRequest.onerror = () => reject(getRequest.error);
		});
	}

	public async getDataset(fileName: string): Promise<any> {
		return this.transaction<any>('readonly', (store) => store.get(fileName));
	}

	public async getAllDatasets(): Promise<Record<string, any>> {
		if (!this.db) {
			// --- DEBUG ---
			console.error('DB_SVC: getAllDatasets called before DB was initialized!');
			throw new Error('Database not initialized');
		}

		return new Promise((resolve, reject) => {
			// --- DEBUG ---
			console.log('DB_SVC: Starting "getAllDatasets" transaction...');
			const transaction = this.db!.transaction('datasets', 'readonly');
			const store = transaction.objectStore('datasets');
			const request = store.getAll();

			request.onsuccess = () => {
				const datasets: Record<string, any> = {};
				request.result.forEach((dataset) => {
					datasets[dataset.fileName] = dataset;
				});
				// --- DEBUG ---
				console.log(
					`DB_SVC: "getAllDatasets" transaction SUCCESSFUL. Found ${request.result.length} records.`
				);
				resolve(datasets);
			};

			request.onerror = () => {
				// --- DEBUG ---
				console.error('DB_SVC: "getAllDatasets" transaction FAILED.', request.error);
				reject(request.error);
			};
		});
	}

	public async removeDataset(fileName: string): Promise<void> {
		if (!this.db) {
			console.error('🔴 DatasetService: Database not initialized for deletion');
			throw new Error('Database not initialized');
		}

		console.log('🟡 DatasetService: Starting removal of dataset:', fileName);

		// Get current state
		this.getAllDatasets().then((datasets) => {
			console.log('🟡 Current DB state before deletion:', datasets);
		});

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction('datasets', 'readwrite');
			const store = transaction.objectStore('datasets');

			console.log('🟡 DatasetService: Created transaction for deletion');

			transaction.oncomplete = async () => {
				console.log('🟢 DatasetService: Transaction completed successfully');

				// Get state after deletion
				this.getAllDatasets().then((datasets) => {
					console.log('🟢 DB state after deletion:', datasets);
				});

				// ✅ Also delete the individual IndexedDB store created by VirtualTable
				const virtualTableDbName = `clinical-dataset-${fileName}`;
				try {
					console.log(`🟡 DatasetService: Deleting VirtualTable database: ${virtualTableDbName}`);
					const deleteRequest = indexedDB.deleteDatabase(virtualTableDbName);

					deleteRequest.onsuccess = () => {
						console.log(`🟢 DatasetService: Successfully deleted VirtualTable database: ${virtualTableDbName}`);
					};

					deleteRequest.onerror = () => {
						console.error(`🔴 DatasetService: Failed to delete VirtualTable database: ${virtualTableDbName}`, deleteRequest.error);
					};

					deleteRequest.onblocked = () => {
						console.warn(`🟠 DatasetService: Delete blocked for VirtualTable database: ${virtualTableDbName} (may have open connections)`);
					};
				} catch (error) {
					console.error(`🔴 DatasetService: Error deleting VirtualTable database: ${virtualTableDbName}`, error);
				}

				resolve();
			};

			transaction.onerror = (event) => {
				console.error('🔴 DatasetService: Transaction error:', event);
				reject(transaction.error);
			};

			transaction.onabort = () => {
				console.error('🔴 DatasetService: Transaction aborted');
				reject(new Error('Transaction aborted'));
			};

			const request = store.delete(fileName);

			request.onsuccess = () => {
				console.log('🟢 DatasetService: Delete request successful for:', fileName);
			};

			request.onerror = () => {
				console.error('🔴 DatasetService: Delete request failed for:', fileName);
				reject(request.error);
			};
		});
	}

	public async getDatabaseSize(): Promise<number> {
		if (!this.db) throw new Error('Database not initialized');

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction('datasets', 'readonly');
			const store = transaction.objectStore('datasets');
			const request = store.getAll();

			request.onsuccess = () => {
				const size = new Blob([JSON.stringify(request.result)]).size;
				resolve(size);
			};

			request.onerror = () => reject(request.error);
		});
	}

	public async getDatasetsWithGraphData(): Promise<Record<string, any>> {
		if (!this.db) throw new Error('Database not initialized');

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction('datasets', 'readonly');
			const store = transaction.objectStore('datasets');
			const request = store.getAll();

			request.onsuccess = () => {
				// Filter datasets with graph data and convert to a Record object
				const datasets: Record<string, any> = {};
				request.result.forEach((dataset) => {
					if (dataset.graphData) {
						datasets[dataset.fileName] = dataset;
					}
				});

				console.log(
					`[DatasetService] Found ${Object.keys(datasets).length} datasets with graph data`
				);
				resolve(datasets);
			};

			request.onerror = () => reject(request.error);
		});
	}
}
