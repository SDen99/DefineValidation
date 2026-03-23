<script lang="ts">
	/**
	 * DatasetEditContent - Reusable component for editing dataset metadata
	 * Used in the edit drawer
	 */
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';
	import { metadataEditState, type DefineType } from '$lib/core/state/metadata/editState.svelte';
	import EditableText from './EditableText.svelte';
	import EditableTextArea from './EditableTextArea.svelte';
	import EditableSelect from './EditableSelect.svelte';
	import ConfirmDeleteModal from '../shared/ConfirmDeleteModal.svelte';
	import type { ItemGroup } from '@sden99/cdisc-types/define-xml';
	import {
		mergeItemWithChanges,
		recordFieldChange,
		hasItemChanges
	} from '$lib/utils/metadata/useEditableItem.svelte';
	import {
		isItemDeleted,
		handleDeleteOrReinstate
	} from '$lib/utils/metadata/useDeleteModal.svelte';
	import { datasetClasses } from '$lib/utils/metadata/datasetClasses';

	// Props
	let {
		oid,
		defineType
	}: {
		oid: string;
		defineType: DefineType;
	} = $props();

	// Extract Define-XML data
	const defineBundle = $derived(extractDefineDataForMetadata());

	// Find the dataset — search both sources since the passed defineType
	// may not match when both ADaM and SDTM are loaded
	const dataset = $derived.by(() => {
		const adamMatch = defineBundle.adamData?.defineData?.ItemGroups?.find(
			(item) => item.OID === oid
		);
		if (adamMatch) return adamMatch;
		return defineBundle.sdtmData?.defineData?.ItemGroups?.find(
			(item) => item.OID === oid
		);
	});

	// Resolve the actual defineType based on where the dataset was found
	const resolvedDefineType = $derived<DefineType>(
		defineBundle.adamData?.defineData?.ItemGroups?.some((item) => item.OID === oid)
			? 'adam'
			: 'sdtm'
	);

	// Use shared utility for editable state
	const editableDataset = $derived.by(() =>
		mergeItemWithChanges(dataset, resolvedDefineType, 'datasets', dataset?.OID)
	);

	// Field change handler
	function handleFieldChange(fieldName: keyof ItemGroup, newValue: any) {
		recordFieldChange(dataset, resolvedDefineType, 'datasets', fieldName, newValue);
	}

	// Delete modal state
	let showDeleteModal = $state(false);
	const isAlreadyDeleted = $derived(isItemDeleted(resolvedDefineType, 'datasets', dataset?.OID));
	const deleteModalMode = $derived(isAlreadyDeleted ? 'reinstate' : 'delete');

	function handleDelete() {
		showDeleteModal = true;
	}

	function confirmDelete() {
		handleDeleteOrReinstate(dataset, resolvedDefineType, 'datasets', isAlreadyDeleted);
		showDeleteModal = false;
	}

	function cancelDelete() {
		showDeleteModal = false;
	}

	// Build class dropdown options based on standard type
	const classOptions = $derived.by(() => {
		const standard = resolvedDefineType === 'adam' ? 'ADaM' : 'SDTM';
		return datasetClasses
			.filter((c) => c.standard === standard)
			.map((c) => ({ value: c.value, label: c.value }));
	});

	const repeatingOptions = [
		{ value: 'Yes', label: 'Yes' },
		{ value: 'No', label: 'No' }
	];
</script>

{#if dataset && editableDataset}
	<div>
		<!-- Header with Modified Badge and Delete Button -->
		<div class="mb-6">
			<div class="mb-2">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<span>Dataset</span>
					<span>›</span>
					<span>{dataset.OID}</span>
					{#if hasItemChanges(resolvedDefineType, 'datasets', dataset.OID)}
						<span class="rounded-full bg-warning px-2 py-0.5 text-xs text-warning-foreground"
							>Modified</span
						>
					{/if}
				</div>
			</div>

			<!-- Name (large title) with Delete/Reinstate inline -->
			<div class="mb-2 flex items-center gap-3">
				{#if metadataEditState.editMode && !isAlreadyDeleted}
					<div class="flex-1">
						<EditableText
							value={editableDataset.Name || ''}
							onSave={(val) => handleFieldChange('Name', val)}
							placeholder="Dataset Name"
							className="text-2xl font-bold"
						/>
					</div>
				{:else}
					<h1 class="text-2xl font-bold">{editableDataset.Name || dataset.OID}</h1>
				{/if}

				<!-- Delete/Reinstate button (only in edit mode) -->
				{#if metadataEditState.editMode}
					{#if isAlreadyDeleted}
						<button
							onclick={handleDelete}
							class="flex items-center gap-2 rounded-lg bg-success px-3 py-1.5 text-sm font-medium text-success-foreground transition-colors hover:bg-success/90"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
							Reinstate
						</button>
					{:else}
						<button
							onclick={handleDelete}
							class="flex items-center gap-2 rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
							Delete
						</button>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Basic Information -->
		<div class="mb-6 rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">Basic Information</h2>
			</div>
			<div class="p-4">
				<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<!-- Name -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Name</dt>
						<dd class="mt-1">
							{#if metadataEditState.editMode && !isAlreadyDeleted}
								<EditableText
									value={editableDataset.Name || ''}
									onSave={(val) => handleFieldChange('Name', val)}
									placeholder="Dataset name"
								/>
							{:else}
								<span class="text-sm">{editableDataset.Name || '—'}</span>
							{/if}
						</dd>
					</div>

					<!-- SASDatasetName -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">SAS Name</dt>
						<dd class="mt-1">
							{#if metadataEditState.editMode && !isAlreadyDeleted}
								<EditableText
									value={editableDataset.SASDatasetName || ''}
									onSave={(val) => handleFieldChange('SASDatasetName', val)}
									placeholder="SAS dataset name"
								/>
							{:else}
								<span class="text-sm font-mono">{editableDataset.SASDatasetName || '—'}</span>
							{/if}
						</dd>
					</div>

					<!-- Class (dropdown) -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Class</dt>
						<dd class="mt-1">
							{#if metadataEditState.editMode && !isAlreadyDeleted}
								<EditableSelect
									value={editableDataset.Class || ''}
									options={classOptions}
									onSave={(val) => handleFieldChange('Class', val)}
									placeholder="Select class"
								/>
							{:else}
								<span class="text-sm">{editableDataset.Class || '—'}</span>
							{/if}
						</dd>
					</div>

					<!-- Purpose -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Purpose</dt>
						<dd class="mt-1">
							{#if metadataEditState.editMode && !isAlreadyDeleted}
								<EditableText
									value={editableDataset.Purpose || ''}
									onSave={(val) => handleFieldChange('Purpose', val)}
									placeholder="Purpose"
								/>
							{:else}
								<span class="text-sm">{editableDataset.Purpose || '—'}</span>
							{/if}
						</dd>
					</div>

					<!-- Repeating (dropdown) -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Repeating</dt>
						<dd class="mt-1">
							{#if metadataEditState.editMode && !isAlreadyDeleted}
								<EditableSelect
									value={editableDataset.Repeating || ''}
									options={repeatingOptions}
									onSave={(val) => handleFieldChange('Repeating', val)}
									placeholder="Yes/No"
								/>
							{:else}
								<span class="text-sm">{editableDataset.Repeating || '—'}</span>
							{/if}
						</dd>
					</div>
				</dl>

				<!-- Description (full width) -->
				<div class="mt-4">
					<dt class="text-sm font-medium text-muted-foreground">Description</dt>
					<dd class="mt-1">
						{#if metadataEditState.editMode && !isAlreadyDeleted}
							<EditableTextArea
								value={editableDataset.Description || ''}
								onSave={(val) => handleFieldChange('Description', val)}
								placeholder="Dataset description"
								rows={3}
							/>
						{:else}
							<p class="whitespace-pre-wrap text-sm">{editableDataset.Description || '—'}</p>
						{/if}
					</dd>
				</div>
			</div>
		</div>
	</div>

	<!-- Delete Confirmation Modal -->
	<ConfirmDeleteModal
		open={showDeleteModal}
		mode={deleteModalMode}
		itemType="Dataset"
		itemName={editableDataset?.Name || dataset?.OID || ''}
		impactedItems={[]}
		onConfirm={confirmDelete}
		onCancel={cancelDelete}
	/>
{:else}
	<div class="text-center">
		<h2 class="mb-4 text-xl font-bold">Dataset Not Found</h2>
		<p class="text-muted-foreground">
			The dataset with OID "{oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
