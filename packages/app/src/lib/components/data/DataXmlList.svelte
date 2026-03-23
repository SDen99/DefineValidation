<script lang="ts">
	// --- CORE SVELTE & COMPONENT IMPORTS ---
	import { Search } from '@lucide/svelte/icons';
	import { Input } from '@sden99/ui-components';
	import DatasetCardItem from './DatasetCardItem.svelte';
	import ConfirmationDialog from '$lib/components/shared/ConfirmationDialog.svelte';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import { metadataEditState } from '$lib/core/state/metadata/editState.svelte';
	import { mergeItemWithChanges } from '$lib/utils/metadata/useEditableItem.svelte';
	import type { ItemGroup } from '@sden99/cdisc-types';
	import { ScrollArea } from '@sden99/ui-components';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { findDatasetOID, findDatasetOIDWithType } from '$lib/utils/datasetOIDLookup';
	import { normalizeDatasetId } from '@sden99/dataset-domain';
	import { validationService } from '$lib/services/validationService.svelte';

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
			const rawMetadata = dataState.getItemGroupMetadata(d.name) as ItemGroup | null;

			// Check if this dataset is marked as deleted in the edit state
			// and merge any pending edit changes into the displayed metadata
			let isDeleted = false;
			const datasetInfo = findDatasetOIDWithType(d.name);
			let metadata = rawMetadata;
			if (datasetInfo) {
				const changeRecord = metadataEditState.getChange(
					datasetInfo.defineType,
					'datasets',
					datasetInfo.oid
				);
				isDeleted = changeRecord?.type === 'DELETED';

				// Merge pending field edits so sidebar cards reflect changes
				if (rawMetadata && changeRecord) {
					metadata = mergeItemWithChanges(
						rawMetadata,
						datasetInfo.defineType,
						'datasets',
						datasetInfo.oid
					) as ItemGroup | null;
				}
			}

			// A card is considered "selected" if its normalized name matches EITHER:
			// 1. The specific domain being viewed (e.g., "adsl").
			// 2. The underlying file ID, when a domain is also selected (this highlights the parent Define.xml).
			// 3. The underlying file ID, when it's a simple file with no domains (e.g., a .sas7bdat file).
			const isSelected =
				d.id === currentDomain || // Matches the specific domain (normalized)
				d.id === normalizedFileId; // Matches the underlying file (normalized)

			// Get validation issue count for this dataset
			const validationIssueCount = validationService.getTotalIssueCount(originalName);

			return {
				id: d.id, // For the #each key
				originalName,
				displayName: metadata?.Name || d.name,
				state,
				metadata,
				isSelected,
				isDeleted,
				validationIssueCount,
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
			await dataState.deleteDataset(datasetToDelete);
		} catch (error) {
			console.error('Dataset deletion failed:', error);
		} finally {
			isDeleting = false;
			datasetToDelete = null;
			dialogOpen = false;
		}
	}

	function handleCancelDelete() {
		datasetToDelete = null;
		dialogOpen = false;
	}

	function handleDatasetClick(datasetId: string) {
		if (isDeleting) return;

		// Step 1: Check if this dataset has Define-XML metadata
		const oid = findDatasetOID(datasetId);
		const hasMetadata = !!oid;

		// Step 2: Check if this dataset has actual data file
		const datasets = dataState.getDatasets();
		const normalized = normalizeDatasetId(datasetId);
		const hasDataFile = !!Object.keys(datasets).find(
			(key) => normalizeDatasetId(key) === normalized
		);

		// Step 3: Check for remembered tab preference (previous session)
		const datasetKey = `${datasetId}_`;
		const rememberedTab = appState.getRememberedTabForDataset(datasetKey);

		// Step 4: Determine target route
		let targetUrl: string;

		if (rememberedTab) {
			// Use remembered preference
			if (rememberedTab === 'metadata' && hasMetadata) {
				targetUrl = `/metadata/datasets/${oid}`;
			} else if (rememberedTab === 'VLM' && hasMetadata) {
				targetUrl = `/metadata/datasets/${oid}?tab=vlm`;
			} else if (rememberedTab === 'data' && hasDataFile) {
				targetUrl = `/datasets/${encodeURIComponent(datasetId)}`;
			} else {
				// Remembered tab not available, fall through to default
				targetUrl = determineDefaultRoute();
			}
		} else {
			// No remembered preference, use default logic
			targetUrl = determineDefaultRoute();
		}

		function determineDefaultRoute(): string {
			// Priority: metadata > dataset > nothing
			if (hasMetadata) {
				return `/metadata/datasets/${oid}`;
			} else if (hasDataFile) {
				return `/datasets/${encodeURIComponent(datasetId)}`;
			}
			// Fallback (shouldn't happen)
			return `/datasets/${encodeURIComponent(datasetId)}`;
		}

		console.log('[DataXmlList] Navigating to dataset:', {
			datasetId,
			hasMetadata,
			hasDataFile,
			rememberedTab,
			targetUrl
		});

		goto(targetUrl);
	}
</script>

<div class="flex h-full flex-col">
	<div class="relative mb-3 flex-none px-3">
		<Search class="text-muted-foreground absolute top-2.5 left-5 h-4 w-4" />
		<Input type="text" placeholder="Search datasets..." bind:value={searchTerm} class="pl-9" />
	</div>

	<ScrollArea class="h-[calc(100vh-18rem)]">
		<div class="px-3">
			<div class="space-y-2">
				{#if cardProps.length > 0}
					{#each cardProps as props (props.id)}
						<DatasetCardItem
							datasetId={props.originalName}
							displayName={props.displayName}
							datasetState={props.state}
							metadata={props.metadata}
							isSelected={props.isSelected}
							isDeleted={props.isDeleted}
							validationIssueCount={props.validationIssueCount}
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
