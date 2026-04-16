<script lang="ts">
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { formatStorageSize } from '$lib/utils/utilFunctions';
	import { Badge, Button } from '@sden99/ui-components';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import { ruleState } from '$lib/core/state/ruleState.svelte';
	import { validationService } from '$lib/services/validationService.svelte';
	import { clearAllTableStates } from '$lib/utils/tableStatePersistence.svelte';

	let storageUsage = $state('');
	let confirming = $state(false);
	let clearing = $state(false);

	async function updateStorageUsage() {
		try {
			const estimate = await navigator.storage.estimate();
			if (estimate.usage) {
				storageUsage = formatStorageSize(estimate.usage);
			}
		} catch (error) {
			console.warn('Storage estimation not available:', error);
			storageUsage = 'N/A';
		}
	}

	$effect(() => {
		updateStorageUsage();
		const interval = setInterval(updateStorageUsage, 5000);
		return () => clearInterval(interval);
	});

	async function handleClearAll() {
		clearing = true;
		try {
			// Delete each dataset from IndexedDB (handles virtual table DBs too)
			const datasets = dataState.getDatasets();
			for (const id of Object.keys(datasets)) {
				await dataState.deleteDataset(id);
			}

			// Clear in-memory dataset state
			dataState.clearDatasets();

			// Clear imported rules
			ruleState.clearAll();

			// Clear table filter/sort persistence
			clearAllTableStates();

			// Clear localStorage entries
			localStorage.removeItem('sas-viewer-state');
			localStorage.removeItem('datasetViewer.lastSelection');

			// Reset validation results
			validationService.revalidate();

			// Reset app view to datasets
			appState.appView.value = 'datasets';

			// Refresh storage display
			await updateStorageUsage();
		} catch (error) {
			console.error('[StorageBadge] Failed to clear all data:', error);
		} finally {
			clearing = false;
			confirming = false;
		}
	}

	function handleCancel() {
		confirming = false;
	}
</script>

{#if confirming}
	<div class="flex items-center gap-1.5">
		<span class="text-muted-foreground text-xs">Clear all data?</span>
		<Button
			variant="destructive"
			size="sm"
			class="h-6 px-2 text-xs"
			disabled={clearing}
			onclick={handleClearAll}
		>
			{clearing ? 'Clearing...' : 'Yes'}
		</Button>
		<Button
			variant="ghost"
			size="sm"
			class="h-6 px-2 text-xs"
			disabled={clearing}
			onclick={handleCancel}
		>
			No
		</Button>
	</div>
{:else}
	<button
		class="group flex cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent p-0"
		onclick={() => confirming = true}
		title="Clear all datasets, rules, and settings"
	>
		<Badge variant="secondary">
			DB: {storageUsage}
		</Badge>
		<Trash2 class="text-muted-foreground h-3.5 w-3.5 transition-colors group-hover:text-destructive" />
	</button>
{/if}
