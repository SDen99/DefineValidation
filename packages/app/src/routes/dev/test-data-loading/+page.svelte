<!-- packages/app/src/routes/test-data-loading/+page.svelte -->
<script lang="ts">
	import { Button } from '@sden99/ui-components';
	import { Card } from '@sden99/ui-components';
	import { Badge } from '@sden99/ui-components';
	import { FileImportManager } from '$lib/core/services/FileImportManager';
	import { ServiceContainer } from '$lib/core/services/ServiceContainer';

	// Direct access to new state for debugging
	import * as dataState from '$lib/core/state/dataState.svelte.ts';

	let fileInput: HTMLInputElement;
	let selectedFiles = $state<File[]>([]);
	let fileImportManager: FileImportManager | null = null;
	let initStatus = $state('idle');
	let processingStatus = $state<Record<string, string>>({});
	let error = $state<string | null>(null);

	// Reactive state from adapter
	const datasets = $derived(dataState.getDatasets());
	const loadingStates = $derived(dataState.getLoadingStates());
	const selectedDatasetId = $derived(dataState.selectedDatasetId.value);
	const processingStats = $derived(dataState.processingStats);

	// Debug info
	const debugInfo = $derived({
		adapterDatasets: Object.keys(dataState.getDatasets()),
		newStateDatasets: Object.keys(dataState.getDatasets()),
		adapterSelected: dataState.selectedDatasetId,
		newStateSelected: dataState.selectedDatasetId.value,
		loadingStates: Object.keys(loadingStates).map((key) => ({
			file: key,
			status: loadingStates[key].status,
			progress: loadingStates[key].progress
		})),
		graphDataCount: Object.values(datasets).filter((d) => d.graphData != null).length,
		defineXmlCount: Object.values(datasets).filter(
			(d) => d.data && typeof d.data === 'object' && 'MetaData' in d.data
		).length
	});

	$effect(() => {
		initializeServices();
	});

	async function initializeServices() {
		try {
			initStatus = 'initializing';
			error = null;

			console.log('🟡 Starting service initialization...');

			// Initialize the service container
			const container = await ServiceContainer.initialize();
			console.log('🟢 ServiceContainer initialized');

			// Create FileImportManager with the container
			fileImportManager = new FileImportManager(container);
			console.log('🟢 FileImportManager created');

			// Load any existing datasets from IndexedDB
			const datasetService = container.getDatasetService();
			const existingDatasets = await datasetService.getAllDatasets();
			if (Object.keys(existingDatasets).length > 0) {
				console.log('🟢 Found existing datasets:', Object.keys(existingDatasets));
				dataState.setDatasets(existingDatasets);
			}

			initStatus = 'ready';
		} catch (err) {
			console.error('🔴 Initialization error:', err);
			error = err instanceof Error ? err.message : 'Unknown initialization error';
			initStatus = 'error';
		}
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			selectedFiles = Array.from(input.files);
			processingStatus = {};
		}
	}

	async function processFiles() {
		console.log('🔵 processFiles called');
		console.log('fileImportManager:', fileImportManager);
		console.log('selectedFiles:', selectedFiles);

		if (!fileImportManager) {
			console.error('❌ No file import manager available');
			error = 'File import manager not initialized';
			return;
		}

		if (selectedFiles.length === 0) {
			console.warn('⚠️ No files selected');
			error = 'No files selected';
			return;
		}

		error = null;
		console.log(`📦 Starting to process ${selectedFiles.length} files`);

		for (const file of selectedFiles) {
			try {
				processingStatus[file.name] = 'processing';
				console.log(`📁 Processing ${file.name}...`);

				const result = await fileImportManager.processFile(file);
				console.log(`📁 Result for ${file.name}:`, result);

				if (result.success) {
					processingStatus[file.name] = 'complete';
					console.log(`✅ ${file.name} processed successfully`);
				} else {
					processingStatus[file.name] = 'error';
					console.error(`❌ ${file.name} failed:`, result.error);
					error = result.error?.message || 'Processing failed';
				}
			} catch (err) {
				processingStatus[file.name] = 'error';
				console.error(`❌ Error processing ${file.name}:`, err);
				error = err instanceof Error ? err.message : 'Unknown error';
			}
		}

		console.log('📦 Processing complete');
		console.log('Final datasets:', dataState.getDatasets());
	}

	function selectDataset(id: string) {
		console.log('Selecting dataset:', id);
		dataState.selectDataset(id, null);
	}

	async function deleteDataset(id: string) {
		console.log('🗑️ Deleting dataset:', id);
		try {
			// First delete from IndexedDB through DatasetService
			const container = await ServiceContainer.initialize();
			const datasetService = container.getDatasetService();
			await datasetService.removeDataset(id);
			console.log('✅ Removed from IndexedDB');

			// Then update state through adapter
			dataState.deleteDataset(id);
			console.log('✅ Removed from state');
		} catch (err) {
			console.error('❌ Error deleting dataset:', err);
			error = err instanceof Error ? err.message : 'Delete failed';
		}
	}

	async function clearAll() {
		dataState.clearDatasets();
		processingStatus = {};
		selectedFiles = [];
		if (fileInput) fileInput.value = '';
	}
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">Test Data Loading - New State Architecture</h1>

	<!-- Initialization Status -->
	<Card class="mb-4 p-4">
		<h2 class="mb-2 text-lg font-semibold">Initialization Status</h2>
		<div class="flex items-center gap-4">
			<Badge
				variant={initStatus === 'ready'
					? 'default'
					: initStatus === 'error'
						? 'destructive'
						: 'secondary'}
			>
				{initStatus}
			</Badge>
			{#if initStatus === 'error'}
				<span class="text-sm text-red-500">{error}</span>
			{/if}
			{#if initStatus === 'ready'}
				<span class="text-green-600">✓ FileImportManager ready</span>
			{/if}
		</div>
	</Card>

	<!-- File Upload Section -->
	<Card class="mb-4 p-4">
		<h2 class="mb-2 text-lg font-semibold">File Upload</h2>
		<div class="space-y-4">
			<div>
				<input
					bind:this={fileInput}
					type="file"
					multiple
					accept=".sas7bdat,.xml"
					onchange={handleFileSelect}
					class="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
				/>
			</div>

			{#if selectedFiles.length > 0}
				<div>
					<h3 class="mb-2 font-medium">Selected Files:</h3>
					<ul class="space-y-1">
						{#each selectedFiles as file}
							<li class="flex items-center gap-2">
								<span>{file.name}</span>
								<span class="text-sm text-gray-500"
									>({(file.size / 1024 / 1024).toFixed(2)} MB)</span
								>
								{#if processingStatus[file.name]}
									<Badge
										variant={processingStatus[file.name] === 'complete'
											? 'default'
											: processingStatus[file.name] === 'error'
												? 'destructive'
												: 'secondary'}
									>
										{processingStatus[file.name]}
									</Badge>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="flex gap-2">
				<Button
					onclick={() => {
						console.log('🔵 Process Files button clicked');
						processFiles();
					}}
					disabled={initStatus !== 'ready' || selectedFiles.length === 0}
				>
					Process Files
				</Button>
				<Button onclick={clearAll} variant="outline">Clear All</Button>
			</div>
		</div>
	</Card>

	<!-- Loading States -->
	{#if Object.keys(loadingStates).length > 0}
		<Card class="mb-4 p-4">
			<h2 class="mb-2 text-lg font-semibold">Loading States</h2>
			<div class="space-y-2">
				{#each Object.entries(loadingStates) as [fileName, state]}
					<div class="flex items-center gap-2">
						<span class="font-mono text-sm">{fileName}</span>
						<Badge variant={state.status === 'error' ? 'destructive' : 'secondary'}>
							{state.status}
						</Badge>
						{#if state.progress > 0}
							<div class="h-2 flex-1 rounded-full bg-gray-200">
								<div
									class="h-2 rounded-full bg-blue-500 transition-all"
									style="width: {state.progress}%"
								></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</Card>
	{/if}

	<!-- Loaded Datasets -->
	<Card class="mb-4 p-4">
		<h2 class="mb-2 text-lg font-semibold">Loaded Datasets</h2>
		{#if Object.keys(datasets).length > 0}
			<div class="space-y-2">
				{#each Object.entries(datasets) as [id, dataset]}
					<div
						class="rounded border p-2 {selectedDatasetId === id
							? 'border-blue-500 bg-blue-50'
							: ''}"
					>
						<div class="flex items-center justify-between">
							<div>
								<button onclick={() => selectDataset(id)} class="font-medium hover:text-blue-600">
									{dataset.fileName}
								</button>
								<div class="text-sm text-gray-500">
									{#if dataset.details}
										Rows: {dataset.details.num_rows || 'N/A'} | Cols: {dataset.details.num_columns || 'N/A'}
									{/if}
									{#if dataset.graphData}
										<Badge variant="outline" class="ml-2">Has Graph Data</Badge>
									{/if}
									{#if dataset.data && typeof dataset.data === 'object' && 'MetaData' in dataset.data}
										<Badge variant="outline" class="ml-2">Define XML</Badge>
									{/if}
								</div>
							</div>
							<Button onclick={() => deleteDataset(id)} variant="destructive" size="sm">
								Delete
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-gray-500">No datasets loaded</p>
		{/if}
	</Card>

	<!-- Processing Stats -->
	<!--	{#if processingStats}
		<Card class="mb-4 p-4">
			<h2 class="mb-2 text-lg font-semibold">Processing Stats</h2>
			<div class="space-y-1 text-sm">
				<div>Upload Time: {processingStats.uploadTime || 'N/A'}ms</div>
				<div>
					Dataset Size: {processingStats.datasetSize
						? (processingStats.datasetSize / 1024 / 1024).toFixed(2)
						: 'N/A'} MB
				</div>
				<div>Rows: {processingStats.numRows || 'N/A'}</div>
				<div>Columns: {processingStats.numColumns || 'N/A'}</div>
			</div>
		</Card>
	{/if} -->

	<!-- Debug Info -->
	<Card class="p-4">
		<h2 class="mb-2 text-lg font-semibold">Debug Info</h2>
		<details>
			<summary class="cursor-pointer">State Comparison</summary>
			<pre class="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
{JSON.stringify(debugInfo, null, 2)}
			</pre>
		</details>
	</Card>
</div>
