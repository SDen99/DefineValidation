<script lang="ts">
	// --- CORE SVELTE & COMPONENT IMPORTS ---
	import { Search, Loader2 } from '@lucide/svelte/icons';
	import { Input } from '@sden99/ui-components';
	import DatasetCardItem from './DatasetCardItem.svelte';
	import ConfirmationDialog from '$lib/components/shared/ConfirmationDialog.svelte';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import type { ItemGroup } from '@sden99/cdisc-types';
	import { ScrollArea } from '@sden99/ui-components';
	import { findDatasetOIDWithType } from '$lib/utils/datasetOIDLookup';
	import { validationService } from '$lib/services/validationService.svelte';
	import { selectDataset } from '$lib/core/actions/selectionAction';
	import { logError } from '$lib/core/state/errorState.svelte';

	// --- LOCAL COMPONENT STATE ---
	let dialogOpen = $state(false);
	let datasetToDelete = $state<string | null>(null);
	let isDeleting = $state(false);
	let searchTerm = $state('');

	// --- COMPUTED VALUES FOR DIALOG ---
	const dialogTitle = $derived('Delete Dataset');
	const dialogMessage = $derived.by(() => {
		if (!datasetToDelete) return '';
		const originalFilename = dataState.getOriginalFilename(datasetToDelete);
		const datasetName = originalFilename || datasetToDelete;
		return `Are you sure you want to delete ${datasetName}? This action cannot be undone.`;
	});

	// --- ACTIVE LOADING FILES ---
	const activeLoads = $derived.by(() => {
		const states = dataState.getLoadingStates();
		return Object.values(states).filter((s) => s.status === 'processing');
	});

	// --- REACTIVE DERIVED STATE ---
	const filteredDatasets = $derived.by(() => {
		const allAvailable = dataState.getAvailableDatasets();
		if (!searchTerm.trim()) {
			return allAvailable;
		}
		const searchLower = searchTerm.toLowerCase();
		return allAvailable.filter((d) => d.name.toLowerCase().includes(searchLower));
	});

	// --- THE FIX: This derived block now contains the complete selection logic ---
	const cardProps = $derived.by(() => {
		// Create reactive dependencies on both parts of the selection state.
		const currentSelectedId = dataState.selectedDatasetId.value;
		const currentDomain = dataState.selectedDomain.value;

		// Normalize them once for efficient comparison.
		const normalizedFileId = currentSelectedId
			? dataState.normalizeDatasetId(currentSelectedId)
			: null;

		return filteredDatasets.map((d) => {
			const originalName = dataState.getOriginalFilename(d.id) || d.name;
			const state = dataState.getDatasetState(originalName);
			const metadata = dataState.getItemGroupMetadata(d.name) as ItemGroup | null;
			const datasetInfo = findDatasetOIDWithType(d.name);

			// A card is considered "selected" if its normalized name matches EITHER:
			// 1. The specific domain being viewed (e.g., "adsl").
			// 2. The underlying file ID, when a domain is also selected (this highlights the parent Define.xml).
			// 3. The underlying file ID, when it's a simple file with no domains (e.g., a .sas7bdat file).
			const isSelected =
				d.id === currentDomain || // Matches the specific domain (normalized)
				d.id === normalizedFileId; // Matches the underlying file (normalized)

			// Get validation status for this dataset
			const validationIssueCount = validationService.getTotalIssueCount(originalName);
			const hasValidationRun = validationService.hasValidationRun(originalName);

			return {
				id: d.id, // For the #each key
				originalName,
				displayName: metadata?.Name || d.name,
				state,
				metadata,
				isSelected,
				validationIssueCount,
				hasValidationRun,
				oid: datasetInfo?.oid || null,
				defineType: datasetInfo?.defineType || null
			};
		});
	});

	// --- HANDLER FUNCTIONS ---
	function handleDeleteClick(originalName: string) {
		datasetToDelete = originalName;
		dialogOpen = true;
	}

	async function handleConfirmDelete() {
		if (!datasetToDelete) return;

		isDeleting = true;
		try {
			validationService.invalidateCache(datasetToDelete);
			await dataState.deleteDataset(datasetToDelete);
			datasetToDelete = null;
			dialogOpen = false;
		} catch (error) {
			logError(error, { dataset: datasetToDelete });
		} finally {
			isDeleting = false;
		}
	}

	function handleCancelDelete() {
		datasetToDelete = null;
		dialogOpen = false;
	}

	function handleDatasetClick(datasetId: string) {
		if (isDeleting) return;
		console.warn(`[DataXmlList] handleDatasetClick called with: '${datasetId}'`);
		selectDataset(datasetId);
	}
</script>

<div class="flex h-full flex-col">
	<div class="relative mb-3 flex-none px-3">
		<Search class="text-muted-foreground absolute top-2.5 left-5 h-4 w-4" />
		<Input type="text" placeholder="Search datasets..." bind:value={searchTerm} class="pl-9" />
	</div>

	<div class="min-h-0 flex-1">
		<ScrollArea class="h-full">
			<div class="px-3">
				<div class="space-y-2">
					{#each activeLoads as load (load.fileName)}
						<div class="bg-muted/50 border-border rounded-lg border px-3 py-2.5">
							<div class="flex items-center gap-2">
								<Loader2 class="text-muted-foreground h-3.5 w-3.5 animate-spin" />
								<span class="text-muted-foreground truncate text-sm font-medium">{load.fileName}</span>
							</div>
							<div class="bg-border mt-2 h-1.5 overflow-hidden rounded-full">
								<div
									class="bg-info h-full rounded-full transition-[width] duration-500 ease-out"
									style="width: {Math.round(load.progress)}%"
								></div>
							</div>
						</div>
					{/each}
					{#if cardProps.length > 0}
						{#each cardProps as props (props.id)}
							<DatasetCardItem
								datasetId={props.originalName}
								displayName={props.displayName}
								datasetState={props.state}
								metadata={props.metadata}
								isSelected={props.isSelected}
								validationIssueCount={props.validationIssueCount}
							hasValidationRun={props.hasValidationRun}
								onDelete={() => handleDeleteClick(props.originalName)}
								onClick={() => handleDatasetClick(props.originalName)}
							/>
						{/each}
					{:else if searchTerm}
						<div class="text-muted-foreground flex h-[150px] items-center justify-center">
							<p>No datasets match '{searchTerm}'</p>
						</div>
					{:else}
						<div class="text-muted-foreground flex h-[150px] items-center justify-center">
							<p>No datasets available.</p>
						</div>
					{/if}
				</div>
			</div>
		</ScrollArea>
	</div>
</div>

<ConfirmationDialog
	open={dialogOpen}
	title={dialogTitle}
	message={dialogMessage}
	confirmText="Delete"
	cancelText="Cancel"
	variant="destructive"
	onConfirm={handleConfirmDelete}
	onCancel={handleCancelDelete}
/>
