<script lang="ts">
	import { page } from '$app/stores';
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';
	
	import { metadataEditState, type DefineType } from '$lib/core/state/metadata/editState.svelte';
	import EditableText from '$lib/components/metadata/edit/EditableText.svelte';
	import EditableTextArea from '$lib/components/metadata/edit/EditableTextArea.svelte';
	import ConfirmDeleteModal from '$lib/components/metadata/shared/ConfirmDeleteModal.svelte';
	import type { ItemDef } from '@sden99/cdisc-types/define-xml';

	// Import shared utilities
	import { mergeItemWithChanges, recordFieldChange, hasItemChanges } from '$lib/utils/metadata/useEditableItem.svelte';
	import { isItemDeleted, handleDeleteOrReinstate } from '$lib/utils/metadata/useDeleteModal.svelte';
	import { goto } from '$app/navigation';

	// Extract Define-XML data
	const defineBundle = $derived(extractDefineDataForMetadata());

	// Determine define type and get active defineData
	const defineType = $derived<DefineType>((defineBundle.adamData ? 'adam' : 'sdtm'));
	const activeDefineData = $derived(
		defineType === 'adam'
			? defineBundle.adamData?.defineData
			: defineBundle.sdtmData?.defineData
	);

	// Find the variable
	const variable = $derived(
		activeDefineData.ItemDefs?.find((item) => item.OID === $page.params.oid)
	);

	// Use shared utility for editable state
	const editableVariable = $derived.by(() =>
		mergeItemWithChanges(variable, defineType, 'variables', variable?.OID)
	);

	// Field change handler - passes current variable value
	function handleFieldChange(fieldName: keyof ItemDef, newValue: any) {
		recordFieldChange(variable, defineType, 'variables', fieldName, newValue);
	}

	// Delete modal state
	let showDeleteModal = $state(false);
	const isAlreadyDeleted = $derived(isItemDeleted(defineType, 'variables', variable?.OID));
	const deleteModalMode = $derived(isAlreadyDeleted ? 'reinstate' : 'delete');

	// Delete action handlers
	function handleDelete() {
		showDeleteModal = true;
	}

	function confirmDelete() {
		handleDeleteOrReinstate(variable, defineType, 'variables', isAlreadyDeleted);
		showDeleteModal = false;
	}

	function cancelDelete() {
		showDeleteModal = false;
	}

	// Navigation helpers
	function navigateToCodeList(oid: string) {
		goto(`/metadata/codelists/${oid}`);
	}

	function navigateToDataset(oid: string) {
		goto(`/metadata/datasets/${oid}`);
	}

	// Generate deduplication signature for ItemDef (same as in tree)
	function getItemDefSignature(itemDef: any): string {
		const normalize = (val: any) => {
			if (val === null || val === undefined || val === '') return 'NULL';
			return String(val);
		};

		return [
			normalize(itemDef.Name),
			normalize(itemDef.DataType),
			normalize(itemDef.Length),
			normalize(itemDef.Label),
			normalize(itemDef.CommentOID),
			normalize(itemDef.CodeListOID),
			normalize(itemDef.Origin?.Type),
			normalize(itemDef.Origin?.Source)
		].join('|');
	}

	// Find all OID variants of this variable (same signature)
	const oidVariants = $derived.by(() => {
		if (!variable) return [];

		const signature = getItemDefSignature(variable);

		return activeDefineData.ItemDefs?.filter((item: any) =>
			getItemDefSignature(item) === signature
		).map((item: any) => item.OID).filter(Boolean).sort() || [];
	});

	// Find datasets that use ANY variant of this variable
	const usedByDatasets = $derived.by(() => {
		if (oidVariants.length === 0) return [];

		const datasets = activeDefineData.ItemGroups?.filter((ig) => {
			// Exclude datasets that are marked as deleted
			if (ig.OID) {
				const change = metadataEditState.getChange(defineType, 'datasets', ig.OID);
				if (change?.type === 'DELETED') return false;
			}
			return ig.ItemRefs?.some((ref) => oidVariants.includes(ref.OID));
		}) || [];

		// Sort alphabetically by Name
		return datasets.sort((a, b) =>
			(a.Name || a.OID || '').localeCompare(b.Name || b.OID || '')
		);
	});

	// Find referenced metadata
	const referencedCodeList = $derived.by(() => {
		if (!editableVariable?.CodeListOID) return null;
		const codelist = activeDefineData.CodeLists?.find((cl) => cl.OID === editableVariable.CodeListOID);
		if (!codelist?.OID) return null;

		// Exclude codelists that are marked as deleted
		const change = metadataEditState.getChange(defineType, 'codelists', codelist.OID);
		if (change?.type === 'DELETED') return null;

		return codelist;
	});

	const referencedValueList = $derived.by(() => {
		if (!editableVariable?.ValueListOID) return null;
		return activeDefineData.ValueListDefs?.find((vl) => vl.OID === editableVariable.ValueListOID);
	});

	// Get impacted items for delete confirmation
	const impactedItemsForDelete = $derived.by(() => {
		return usedByDatasets.map((dataset) => ({
			name: dataset.Name || dataset.OID || '',
			type: 'Dataset',
			onClick: () => {
				if (dataset.OID) {
					navigateToDataset(dataset.OID);
					showDeleteModal = false;
				}
			}
		}));
	});
</script>

{#if variable && editableVariable}
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center justify-between">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<span>Variable</span>
					<span>›</span>
					<span>{variable.OID}</span>
					{#if hasItemChanges(defineType, 'variables', variable.OID)}
						<span class="rounded-full bg-warning px-2 py-0.5 text-xs text-warning-foreground">Modified</span>
					{/if}
				</div>

				<!-- Delete/Reinstate button (only in edit mode) -->
				{#if metadataEditState.editMode}
					{#if isAlreadyDeleted}
						<button
							onclick={handleDelete}
							class="flex items-center gap-2 rounded-lg bg-success px-3 py-1.5 text-sm font-medium text-success-foreground transition-colors hover:bg-success/90"
							title="Reinstate this variable"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
							Reinstate Variable
						</button>
					{:else}
						<button
							onclick={handleDelete}
							class="flex items-center gap-2 rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
							title="Delete this variable"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
							Delete Variable
						</button>
					{/if}
				{/if}
			</div>

			<!-- Editable Name -->
			{#if metadataEditState.editMode && !isAlreadyDeleted}
				<div class="mb-2">
					<EditableText
						value={editableVariable.Name || ''}
						onSave={(val) => handleFieldChange('Name', val)}
						placeholder="Variable Name"
						className="text-3xl font-bold"
					/>
				</div>
			{:else}
				<h1 class="mb-2 text-3xl font-bold">{editableVariable.Name || variable.OID}</h1>
			{/if}

			<div class="flex gap-4 text-sm text-muted-foreground">
				<span>Type: {editableVariable.DataType || 'unknown'}</span>
				{#if editableVariable.Length}
					<span>Length: {editableVariable.Length}</span>
				{/if}
				{#if editableVariable.SignificantDigits}
					<span>Significant Digits: {editableVariable.SignificantDigits}</span>
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
									value={editableVariable.Name || ''}
									onSave={(val) => handleFieldChange('Name', val)}
									placeholder="Variable name"
								/>
							{:else}
								<span class="text-sm">{editableVariable.Name || '—'}</span>
							{/if}
						</dd>
					</div>

					<!-- SASFieldName -->
					{#if editableVariable.SASFieldName || metadataEditState.editMode}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">SAS Field Name</dt>
							<dd class="mt-1">
								{#if metadataEditState.editMode && !isAlreadyDeleted}
									<EditableText
										value={editableVariable.SASFieldName || ''}
										onSave={(val) => handleFieldChange('SASFieldName', val)}
										placeholder="SAS variable name"
									/>
								{:else}
									<span class="text-sm font-mono">{editableVariable.SASFieldName || '—'}</span>
								{/if}
							</dd>
						</div>
					{/if}

					<!-- DataType -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Data Type</dt>
						<dd class="mt-1">
							{#if metadataEditState.editMode && !isAlreadyDeleted}
								<EditableText
									value={editableVariable.DataType || ''}
									onSave={(val) => handleFieldChange('DataType', val)}
									placeholder="text, integer, float, date, etc."
								/>
							{:else}
								<span class="text-sm">{editableVariable.DataType || '—'}</span>
							{/if}
						</dd>
					</div>

					<!-- Length -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Length</dt>
						<dd class="mt-1">
							{#if metadataEditState.editMode && !isAlreadyDeleted}
								<EditableText
									value={editableVariable.Length || ''}
									onSave={(val) => handleFieldChange('Length', val)}
									placeholder="Variable length"
								/>
							{:else}
								<span class="text-sm">{editableVariable.Length || '—'}</span>
							{/if}
						</dd>
					</div>

					<!-- SignificantDigits -->
					{#if editableVariable.SignificantDigits || metadataEditState.editMode}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Significant Digits</dt>
							<dd class="mt-1">
								{#if metadataEditState.editMode && !isAlreadyDeleted}
									<EditableText
										value={editableVariable.SignificantDigits || ''}
										onSave={(val) => handleFieldChange('SignificantDigits', val)}
										placeholder="Number of significant digits"
									/>
								{:else}
									<span class="text-sm">{editableVariable.SignificantDigits || '—'}</span>
								{/if}
							</dd>
						</div>
					{/if}

					<!-- DisplayFormat -->
					{#if editableVariable.DisplayFormat || metadataEditState.editMode}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Display Format</dt>
							<dd class="mt-1">
								{#if metadataEditState.editMode && !isAlreadyDeleted}
									<EditableText
										value={editableVariable.DisplayFormat || ''}
										onSave={(val) => handleFieldChange('DisplayFormat', val)}
										placeholder="Display format"
									/>
								{:else}
									<span class="text-sm font-mono">{editableVariable.DisplayFormat || '—'}</span>
								{/if}
							</dd>
						</div>
					{/if}

					<!-- Origin -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Origin</dt>
						<dd class="mt-1">
							{#if metadataEditState.editMode && !isAlreadyDeleted}
								<EditableText
									value={editableVariable.Origin || ''}
									onSave={(val) => handleFieldChange('Origin', val)}
									placeholder="CRF, Derived, Assigned, etc."
								/>
							{:else}
								<span class="text-sm">{editableVariable.Origin || '—'}</span>
							{/if}
						</dd>
					</div>
				</dl>

				<!-- Description (full width) -->
				{#if editableVariable.Description || metadataEditState.editMode}
					<div class="mt-4">
						<dt class="text-sm font-medium text-muted-foreground">Description</dt>
						<dd class="mt-1">
							{#if metadataEditState.editMode && !isAlreadyDeleted}
								<EditableTextArea
									value={editableVariable.Description || ''}
									onSave={(val) => handleFieldChange('Description', val)}
									placeholder="Variable description"
									rows={3}
								/>
							{:else}
								<p class="text-sm whitespace-pre-wrap">{editableVariable.Description || '—'}</p>
							{/if}
						</dd>
					</div>
				{/if}
			</div>
		</div>

		<!-- References -->
		<div class="mb-6 rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">References</h2>
			</div>
			<div class="p-4">
				<dl class="space-y-4">
					<!-- CodeList Reference -->
					{#if editableVariable.CodeListOID || referencedCodeList}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">CodeList</dt>
							<dd class="mt-1">
								{#if referencedCodeList}
									<button
										onclick={() => navigateToCodeList(referencedCodeList.OID!)}
										class="inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
									>
										<span class="font-medium">{referencedCodeList.Name || referencedCodeList.OID}</span>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
										</svg>
									</button>
								{:else}
									<span class="text-sm text-muted-foreground">{editableVariable.CodeListOID} (not found)</span>
								{/if}
							</dd>
						</div>
					{/if}

					<!-- ValueList Reference -->
					{#if editableVariable.ValueListOID || referencedValueList}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Value List (VLM)</dt>
							<dd class="mt-1">
								{#if referencedValueList}
									<span class="rounded border px-3 py-1.5 text-sm">
										{referencedValueList.OID}
									</span>
								{:else}
									<span class="text-sm text-muted-foreground">{editableVariable.ValueListOID} (not found)</span>
								{/if}
							</dd>
						</div>
					{/if}

					<!-- No references -->
					{#if !editableVariable.CodeListOID && !editableVariable.ValueListOID}
						<p class="text-sm text-muted-foreground">
							This variable has no references to controlled terminology or value-level metadata.
						</p>
					{/if}
				</dl>
			</div>
		</div>

		<!-- OID Variants -->
		{#if oidVariants.length > 1}
			<div class="rounded-lg border bg-card">
				<div class="border-b p-4">
					<h2 class="text-lg font-semibold">OID Variants ({oidVariants.length})</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						This variable has multiple OIDs with identical basic information
					</p>
				</div>
				<div class="p-4">
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{#each oidVariants as oid}
							{@const isCurrent = oid === variable?.OID}
							<div
								class="rounded border p-2 text-sm font-mono {isCurrent ? 'bg-primary/10 border-primary' : ''}"
							>
								{oid}
								{#if isCurrent}
									<span class="ml-2 text-xs text-primary">(current)</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Used By (Datasets) -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">Used By ({usedByDatasets.length} datasets)</h2>
				{#if oidVariants.length > 1}
					<p class="mt-1 text-sm text-muted-foreground">
						Aggregated across all {oidVariants.length} OID variants
					</p>
				{/if}
			</div>
			<div class="p-4">
				{#if usedByDatasets.length > 0}
					<div class="space-y-1">
						{#each usedByDatasets as dataset}
							<button
								onclick={() => dataset.OID && navigateToDataset(dataset.OID)}
								class="w-full rounded border p-2 text-left transition-colors hover:bg-muted"
							>
								<div class="flex items-center justify-between gap-4">
									<div class="flex-1">
										<div class="text-sm font-medium">{dataset.Name || dataset.OID}</div>
										{#if (dataset as any).Label}
											<div class="text-xs text-muted-foreground">{(dataset as any).Label}</div>
										{/if}
									</div>
									<div class="flex-shrink-0">
										<span class="text-xs text-muted-foreground">
											{(dataset as any).Domain || 'Dataset'}
										</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">
						This variable is not currently used by any datasets.
					</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Delete Confirmation Modal -->
	<ConfirmDeleteModal
		open={showDeleteModal}
		mode={deleteModalMode}
		itemType="Variable"
		itemName={editableVariable?.Name || variable?.OID || ''}
		impactedItems={impactedItemsForDelete}
		onConfirm={confirmDelete}
		onCancel={cancelDelete}
	/>
{:else}
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="mb-4 text-2xl font-bold">Variable Not Found</h1>
		<p class="text-muted-foreground">
			The variable with OID "{$page.params.oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
