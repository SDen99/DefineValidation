<script lang="ts">
	/**
	 * Performance Dashboard
	 * Real-time visualization of dataset switching performance metrics
	 */
	import {
		getAllMetrics,
		getCurrentSession,
		getAggregatedMetrics,
		getRecentMetrics,
		clearMetrics,
		exportMetrics,
		getConfig,
		updateConfig,
		type PerformanceMetric
	} from '$lib/utils/performanceMetrics.svelte';

	// Reactive state
	const allMetrics = $derived(getAllMetrics());
	const currentSession = $derived(getCurrentSession());
	const recentMetrics = $derived(getRecentMetrics(20));
	const config = $derived(getConfig());

	// UI state
	let selectedCategory = $state<'all' | 'selection' | 'worker' | 'component' | 'data'>('all');
	let isExpanded = $state(false);
	let showRawMetrics = $state(false);

	// Filtered metrics by category
	const filteredMetrics = $derived(
		selectedCategory === 'all'
			? recentMetrics
			: recentMetrics.filter((m) => m.category === selectedCategory)
	);

	// Aggregated statistics for key metrics
	const stats = $derived({
		totalSelection: getAggregatedMetrics('total-selection', 'selection'),
		findSource: getAggregatedMetrics('find-source', 'selection'),
		stateUpdate: getAggregatedMetrics('state-update', 'selection'),
		workerDatasetSelection: getAggregatedMetrics('worker-dataset-selection', 'worker'),
		sendDataChunks: getAggregatedMetrics('send-data-chunks', 'worker'),
		virtualTableReload: getAggregatedMetrics('virtualtable-reload', 'data'),
		getTotalCount: getAggregatedMetrics('get-total-count', 'data'),
		loadWindow: getAggregatedMetrics('load-window', 'data')
	});

	// Category colors
	const categoryColors: Record<string, string> = {
		selection: 'bg-blue-500 dark:bg-blue-600',
		worker: 'bg-purple-500 dark:bg-purple-600',
		component: 'bg-green-500 dark:bg-green-600',
		data: 'bg-orange-500 dark:bg-orange-600',
		other: 'bg-gray-500 dark:bg-gray-600'
	};

	// Format duration
	function formatDuration(ms: number | undefined): string {
		if (ms === undefined) return 'N/A';
		if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
		if (ms < 1000) return `${ms.toFixed(2)}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}

	// Handle export - copy to clipboard
	let copyStatus = $state<'idle' | 'copied' | 'error'>('idle');

	async function handleExport() {
		try {
			const json = exportMetrics();
			await navigator.clipboard.writeText(json);
			copyStatus = 'copied';
			setTimeout(() => {
				copyStatus = 'idle';
			}, 2000);
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
			copyStatus = 'error';
			setTimeout(() => {
				copyStatus = 'idle';
			}, 2000);
		}
	}

	// Toggle dashboard
	function toggleDashboard() {
		isExpanded = !isExpanded;
	}
</script>

<!-- Floating Performance Dashboard -->
<div class="fixed bottom-4 right-4 z-50 font-sans">
	{#if !isExpanded}
		<!-- Collapsed State - Mini Indicator -->
		<button
			onclick={toggleDashboard}
			class="bg-slate-900 dark:bg-slate-950 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-slate-800 dark:hover:bg-slate-900 transition-all flex items-center gap-2 border border-slate-700 dark:border-slate-800"
		>
			<span class="text-2xl">⏱️</span>
			<div class="text-left">
				<div class="text-xs text-slate-400 dark:text-slate-500">Performance</div>
				<div class="text-sm font-semibold">{allMetrics.length} metrics</div>
			</div>
		</button>
	{:else}
		<!-- Expanded State - Full Dashboard -->
		<div
			class="bg-slate-900 dark:bg-slate-950 text-white rounded-lg shadow-2xl border border-slate-700 dark:border-slate-800 w-[600px] max-h-[80vh] overflow-hidden flex flex-col"
		>
			<!-- Header -->
			<div class="bg-slate-800 dark:bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-700 dark:border-slate-800">
				<div class="flex items-center gap-3">
					<span class="text-2xl">⏱️</span>
					<div>
						<h3 class="text-lg font-bold text-white m-0">Performance Dashboard</h3>
						<div class="text-xs text-slate-400 dark:text-slate-500">Dataset Switching Analytics</div>
					</div>
				</div>
				<div class="flex gap-2">
					<button
						onclick={() => (showRawMetrics = !showRawMetrics)}
						class="px-3 py-1 text-xs rounded bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 transition-colors"
						title={showRawMetrics ? 'Show Summary' : 'Show Raw Metrics'}
					>
						{showRawMetrics ? '📊 Summary' : '📋 Raw'}
					</button>
					<button
						onclick={handleExport}
						class="px-3 py-1 text-xs rounded transition-colors"
						class:bg-slate-700={copyStatus === 'idle'}
						class:dark:bg-slate-800={copyStatus === 'idle'}
						class:hover:bg-slate-600={copyStatus === 'idle'}
						class:dark:hover:bg-slate-700={copyStatus === 'idle'}
						class:bg-green-700={copyStatus === 'copied'}
						class:dark:bg-green-800={copyStatus === 'copied'}
						class:bg-red-700={copyStatus === 'error'}
						class:dark:bg-red-800={copyStatus === 'error'}
						title="Copy Metrics to Clipboard"
					>
						{#if copyStatus === 'copied'}
							✅ Copied!
						{:else if copyStatus === 'error'}
							❌ Error
						{:else}
							📋 Copy
						{/if}
					</button>
					<button
						onclick={clearMetrics}
						class="px-3 py-1 text-xs rounded bg-red-900 dark:bg-red-950 hover:bg-red-800 dark:hover:bg-red-900 transition-colors"
						title="Clear All Metrics"
					>
						🗑️ Clear
					</button>
					<button
						onclick={toggleDashboard}
						class="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors"
					>
						✕
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="overflow-y-auto flex-1 p-4 space-y-4">
				{#if !showRawMetrics}
					<!-- Summary View -->

					<!-- Current Session -->
					{#if currentSession}
						<div class="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
							<div class="text-sm font-semibold text-blue-300 mb-2">🎯 Active Session</div>
							<div class="text-xs text-slate-300">
								{currentSession.sessionId}
							</div>
							<div class="text-xs text-slate-400 mt-1">
								Duration: {formatDuration(performance.now() - currentSession.startTime)} •
								{currentSession.metrics.length} metrics
							</div>
						</div>
					{/if}

					<!-- Key Statistics -->
					<div class="space-y-2">
						<div class="text-sm font-semibold text-slate-300 mb-2">📈 Key Metrics</div>

						{#if stats.totalSelection}
							<div class="bg-slate-800 rounded p-2 border border-slate-700">
								<div class="flex justify-between items-center mb-1">
									<span class="text-xs font-medium text-blue-300">Total Selection Time</span>
									<span class="text-xs text-slate-400">{stats.totalSelection.count} samples</span>
								</div>
								<div class="grid grid-cols-4 gap-2 text-xs">
									<div>
										<div class="text-slate-400">Last</div>
										<div class="font-semibold text-white">{formatDuration(stats.totalSelection.last)}</div>
									</div>
									<div>
										<div class="text-slate-400">Avg</div>
										<div class="font-semibold text-green-400">
											{formatDuration(stats.totalSelection.avg)}
										</div>
									</div>
									<div>
										<div class="text-slate-400">Min</div>
										<div class="font-semibold text-slate-300">
											{formatDuration(stats.totalSelection.min)}
										</div>
									</div>
									<div>
										<div class="text-slate-400">P95</div>
										<div class="font-semibold text-orange-400">
											{formatDuration(stats.totalSelection.p95)}
										</div>
									</div>
								</div>
							</div>
						{/if}

						{#if stats.sendDataChunks}
							<div class="bg-slate-800 rounded p-2 border border-slate-700">
								<div class="flex justify-between items-center mb-1">
									<span class="text-xs font-medium text-purple-300">Worker Data Transfer</span>
									<span class="text-xs text-slate-400">{stats.sendDataChunks.count} transfers</span>
								</div>
								<div class="grid grid-cols-4 gap-2 text-xs">
									<div>
										<div class="text-slate-400">Last</div>
										<div class="font-semibold text-white">{formatDuration(stats.sendDataChunks.last)}</div>
									</div>
									<div>
										<div class="text-slate-400">Avg</div>
										<div class="font-semibold text-green-400">
											{formatDuration(stats.sendDataChunks.avg)}
										</div>
									</div>
									<div>
										<div class="text-slate-400">Min</div>
										<div class="font-semibold text-slate-300">
											{formatDuration(stats.sendDataChunks.min)}
										</div>
									</div>
									<div>
										<div class="text-slate-400">P95</div>
										<div class="font-semibold text-orange-400">
											{formatDuration(stats.sendDataChunks.p95)}
										</div>
									</div>
								</div>
							</div>
						{/if}

						{#if stats.virtualTableReload}
							<div class="bg-slate-800 rounded p-2 border border-slate-700">
								<div class="flex justify-between items-center mb-1">
									<span class="text-xs font-medium text-green-300">VirtualTable Reload</span>
									<span class="text-xs text-slate-400">{stats.virtualTableReload.count} reloads</span>
								</div>
								<div class="grid grid-cols-4 gap-2 text-xs">
									<div>
										<div class="text-slate-400">Last</div>
										<div class="font-semibold text-white">
											{formatDuration(stats.virtualTableReload.last)}
										</div>
									</div>
									<div>
										<div class="text-slate-400">Avg</div>
										<div class="font-semibold text-green-400">
											{formatDuration(stats.virtualTableReload.avg)}
										</div>
									</div>
									<div>
										<div class="text-slate-400">Min</div>
										<div class="font-semibold text-slate-300">
											{formatDuration(stats.virtualTableReload.min)}
										</div>
									</div>
									<div>
										<div class="text-slate-400">P95</div>
										<div class="font-semibold text-orange-400">
											{formatDuration(stats.virtualTableReload.p95)}
										</div>
									</div>
								</div>
							</div>
						{/if}
					</div>

					<!-- Category Filter -->
					<div class="flex gap-2 flex-wrap">
						<button
							onclick={() => (selectedCategory = 'all')}
							class="px-2 py-1 text-xs rounded transition-colors"
							class:bg-slate-700={selectedCategory === 'all'}
							class:bg-slate-800={selectedCategory !== 'all'}
						>
							All
						</button>
						<button
							onclick={() => (selectedCategory = 'selection')}
							class="px-2 py-1 text-xs rounded transition-colors"
							class:bg-blue-700={selectedCategory === 'selection'}
							class:bg-slate-800={selectedCategory !== 'selection'}
						>
							Selection
						</button>
						<button
							onclick={() => (selectedCategory = 'worker')}
							class="px-2 py-1 text-xs rounded transition-colors"
							class:bg-purple-700={selectedCategory === 'worker'}
							class:bg-slate-800={selectedCategory !== 'worker'}
						>
							Worker
						</button>
						<button
							onclick={() => (selectedCategory = 'component')}
							class="px-2 py-1 text-xs rounded transition-colors"
							class:bg-green-700={selectedCategory === 'component'}
							class:bg-slate-800={selectedCategory !== 'component'}
						>
							Component
						</button>
						<button
							onclick={() => (selectedCategory = 'data')}
							class="px-2 py-1 text-xs rounded transition-colors"
							class:bg-orange-700={selectedCategory === 'data'}
							class:bg-slate-800={selectedCategory !== 'data'}
						>
							Data
						</button>
					</div>

					<!-- Recent Metrics Timeline -->
					<div class="space-y-1">
						<div class="text-sm font-semibold text-slate-300 mb-2">
							📜 Recent Metrics ({filteredMetrics.length})
						</div>
						{#each filteredMetrics as metric}
							<div class="bg-slate-800 rounded p-2 border border-slate-700 text-xs">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<span class="w-2 h-2 rounded-full {categoryColors[metric.category]}"></span>
										<span class="font-medium text-white">{metric.name}</span>
										<span class="text-slate-400">({metric.category})</span>
									</div>
									<span class="font-semibold text-green-400">{formatDuration(metric.duration)}</span>
								</div>
								{#if metric.metadata && Object.keys(metric.metadata).length > 0}
									<div class="mt-1 text-slate-400 text-xxs font-mono">
										{JSON.stringify(metric.metadata)}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<!-- Raw Metrics View -->
					<div class="space-y-2">
						<div class="text-sm font-semibold text-slate-300 mb-2">
							📋 Raw Metrics ({allMetrics.length})
						</div>
						<pre
							class="bg-slate-950 p-3 rounded text-xxs font-mono text-slate-300 overflow-x-auto">{JSON.stringify(
								allMetrics,
								null,
								2
							)}</pre>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="bg-slate-800 px-4 py-2 border-t border-slate-700 text-xs text-slate-400">
				<div class="flex justify-between items-center">
					<div>
						Total metrics: {allMetrics.length} • Enabled: {config.enabled ? '✅' : '❌'}
					</div>
					<div>
						💡 Tip: Switch datasets to see performance metrics
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Scrollbar styling for dark theme */
	:global(.overflow-y-auto::-webkit-scrollbar) {
		width: 8px;
	}

	:global(.overflow-y-auto::-webkit-scrollbar-track) {
		background: hsl(var(--background));
	}

	:global(.overflow-y-auto::-webkit-scrollbar-thumb) {
		background: hsl(var(--muted));
		border-radius: 4px;
	}

	:global(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
		background: hsl(var(--muted-foreground));
	}
</style>
