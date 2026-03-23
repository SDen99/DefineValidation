// packages/app/src/lib/core/services/data.worker.ts

let datasets = new Map<string, any[]>();
let sortedCache = new Map<string, { sortKey: string; data: any[] }>();

self.onmessage = (e) => {
	const { type, payload } = e.data;

	switch (type) {
		case 'DATA_CHUNK':
			handleDataChunk(payload);
			break;
		case 'GET_SORTED_ROWS':
			handleGetSortedRows(payload);
			break;
	}
};

function handleDataChunk({ datasetId, chunk, chunkIndex, totalChunks, isLastChunk }) {
	// âœ¨ FIX: Clear existing dataset if this is the first chunk
	if (chunkIndex === 0) {
		datasets.set(datasetId, []);
		clearCacheForDataset(datasetId);
	}

	if (!datasets.has(datasetId)) {
		datasets.set(datasetId, []);
	}

	const dataset = datasets.get(datasetId)!;
	dataset.push(...chunk);

	if (isLastChunk) {
		console.log(`[Worker] Dataset ${datasetId} fully loaded: ${dataset.length} rows`);

		self.postMessage({
			type: 'DATASET_READY',
			payload: { datasetId, totalRows: dataset.length }
		});
	}
}

function clearCacheForDataset(datasetId: string) {
	// Remove all cache entries for this dataset
	for (const [cacheKey, cacheEntry] of sortedCache.entries()) {
		if (cacheKey.startsWith(`${datasetId}:`)) {
			sortedCache.delete(cacheKey);
		}
	}
	console.log(`[Worker] Cleared sort cache for dataset: ${datasetId}`);
}

function handleGetSortedRows({ datasetId, sortConfig, visibleRange }) {
	const dataset = datasets.get(datasetId);
	if (!dataset) {
		console.error(`[Worker] Dataset not found: ${datasetId}`);
		return;
	}

	// 🚨 DEBUG: Log what we're processing
	console.log(`[Worker] Processing request for dataset: ${datasetId}`);
	console.log(`[Worker] Dataset size: ${dataset.length} rows`);
	console.log(`[Worker] Requested range: ${visibleRange.start}-${visibleRange.end}`);

	// Calculate range size for logging
	const { start, end } = visibleRange;
	const rangeSize = end - start;
	console.log(`[Worker] Range size: ${rangeSize} rows`);

	// Check cache first
	const sortKey = JSON.stringify(sortConfig);
	const cacheKey = `${datasetId}:${sortKey}`;

	let sortedData;
	if (sortedCache.has(cacheKey)) {
		sortedData = sortedCache.get(cacheKey)!.data;
		console.log(`[Worker] Using cached sort for: ${sortKey.substring(0, 50)}...`);
	} else {
		console.log(`[Worker] Sorting dataset with config:`, sortConfig);
		sortedData = [...dataset].sort(createSortComparator(sortConfig));
		sortedCache.set(cacheKey, { sortKey, data: sortedData });
		console.log(`[Worker] Cached new sort result`);
	}

	// Return only visible slice
	const actualStart = Math.max(0, visibleRange.start);
	const actualEnd = Math.min(sortedData.length, visibleRange.end);
	const visibleRows = sortedData.slice(actualStart, actualEnd);

	// Log the response size
	console.log(
		`[Worker] ✅ Returning ${visibleRows.length} rows for range ${actualStart}-${actualEnd}`
	);

	self.postMessage({
		type: 'SORTED_ROWS_RESULT',
		payload: {
			rows: visibleRows,
			totalRows: dataset.length,
			range: { start: actualStart, end: actualEnd },
			requestedRange: visibleRange,
			actualReturned: visibleRows.length
		}
	});
}

function createSortComparator(sortConfig: Array<{ column: string; direction: 'asc' | 'desc' }>) {
	return (a: any, b: any) => {
		for (const sort of sortConfig) {
			const { column, direction } = sort;

			let aVal = a[column];
			let bVal = b[column];

			// Handle null/undefined
			if (aVal === null || aVal === undefined) {
				if (bVal === null || bVal === undefined) continue;
				return direction === 'asc' ? -1 : 1;
			}
			if (bVal === null || bVal === undefined) {
				return direction === 'asc' ? 1 : -1;
			}

			// Type-aware comparison
			let comparison = 0;
			if (typeof aVal === 'number' && typeof bVal === 'number') {
				comparison = aVal - bVal;
			} else {
				comparison = String(aVal).localeCompare(String(bVal));
			}

			if (comparison !== 0) {
				return direction === 'asc' ? comparison : -comparison;
			}
		}
		return 0;
	};
}
