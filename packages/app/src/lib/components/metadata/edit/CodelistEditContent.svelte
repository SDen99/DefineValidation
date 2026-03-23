<script lang="ts">
	/**
	 * CodelistEditContent - Reusable component for editing codelist metadata
	 */
	import { goto } from '$app/navigation';
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';
	import { metadataEditState, type DefineType } from '$lib/core/state/metadata/editState.svelte';
	import EditableText from './EditableText.svelte';
	import ConfirmDeleteModal from '../shared/ConfirmDeleteModal.svelte';
	import { mergeItemWithChanges, recordFieldChange, hasItemChanges } from '$lib/utils/metadata/useEditableItem.svelte';
	import { isItemDeleted, handleDeleteOrReinstate } from '$lib/utils/metadata/useDeleteModal.svelte';

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

	// Find the codelist in combined data
	const codelist = $derived(
		defineBundle.combined?.CodeLists?.find((cl) => cl.OID === oid)
	);

	// Get the active defineData based on which source contains the codelist
	const activeDefineData = $derived(
		defineType === 'adam'
			? defineBundle.adamData?.defineData
			: defineBundle.sdtmData?.defineData
	);

	// Editable state
	const editableCodelist = $derived.by(() =>
		mergeItemWithChanges(codelist, defineType, 'codelists', codelist?.OID)
	);

	// Navigate helper
	function navigateToVariable(oid: string) {
		goto(`/metadata/variables/${oid}`);
	}

	// Find variables that use this codelist
	const usedByVariables = $derived.by(() => {
		if (!activeDefineData) return [];

		const variables = activeDefineData.ItemDefs?.filter((item) => {
			if (item.OID) {
				const change = metadataEditState.getChange(defineType, 'variables', item.OID);
				if (change?.type === 'DELETED') return false;
			}
			return item.CodeListOID === oid;
		}) || [];

		return variables.flatMap((variable) => {
			const datasetsUsingVariable = activeDefineData.ItemGroups?.filter((ig) => {
				if (ig.OID) {
					const change = metadataEditState.getChange(defineType, 'datasets', ig.OID);
					if (change?.type === 'DELETED') return false;
				}
				return ig.ItemRefs?.some((ref) => ref.OID === variable.OID);
			}) || [];

			return datasetsUsingVariable.map((dataset) => ({
				variable,
				dataset,
				displayName: `${variable.Name} in ${dataset.Name || dataset.OID}`
			}));
		});
	});

	// Determine codelist type
	const isEnumerated = $derived((editableCodelist?.EnumeratedItems?.length ?? 0) > 0);
	const codelistItems = $derived(
		isEnumerated
			? (editableCodelist?.EnumeratedItems || [])
			: (editableCodelist?.CodeListItems || [])
	);

	// Editing functions
	function handleNameChange(newName: string) {
		recordFieldChange(codelist, defineType, 'codelists', 'Name', newName);
	}

	function handleCodedValueChange(index: number, field: 'CodedValue' | 'Decode', newValue: string) {
		if (!codelist?.OID || !editableCodelist) return;
		if (index < 0 || index >= codelistItems.length) return;

		const updatedItems = [...codelistItems];

		if (field === 'CodedValue') {
			updatedItems[index] = { ...updatedItems[index], CodedValue: newValue };
		} else {
			if (!isEnumerated) {
				updatedItems[index] = {
					...updatedItems[index],
					Decode: {
						...updatedItems[index].Decode,
						TranslatedText: newValue,
						Lang: 'en'
					}
				};
			}
		}

		const fieldName = isEnumerated ? 'EnumeratedItems' : 'CodeListItems';
		const originalValue = isEnumerated
			? (editableCodelist.EnumeratedItems || codelist.EnumeratedItems)
			: (editableCodelist.CodeListItems || codelist.CodeListItems);

		metadataEditState.recordChange(
			defineType,
			'codelists',
			codelist.OID,
			fieldName,
			updatedItems,
			originalValue
		);
	}

	function addCodedValue() {
		if (!codelist?.OID || !editableCodelist) return;

		const nextOrderNumber = (codelistItems.length + 1).toString();

		const newItem: any = {
			CodedValue: '',
			OrderNumber: nextOrderNumber,
			Aliases: []
		};

		if (!isEnumerated) {
			newItem.Rank = null;
			newItem.ExtendedValue = !!editableCodelist.StandardOID;
			newItem.Decode = {
				TranslatedText: '',
				Lang: 'en'
			};
		}

		const updatedItems = [...codelistItems, newItem];

		const fieldName = isEnumerated ? 'EnumeratedItems' : 'CodeListItems';
		const originalValue = isEnumerated
			? (editableCodelist.EnumeratedItems || codelist.EnumeratedItems)
			: (editableCodelist.CodeListItems || codelist.CodeListItems);

		metadataEditState.recordChange(
			defineType,
			'codelists',
			codelist.OID,
			fieldName,
			updatedItems,
			originalValue
		);
	}

	function deleteCodedValue(index: number) {
		if (!codelist?.OID || !editableCodelist) return;
		if (index < 0 || index >= codelistItems.length) return;

		if (!confirm(`Delete coded value "${codelistItems[index].CodedValue}"?`)) {
			return;
		}

		const updatedItems = codelistItems.filter((_, i) => i !== index);

		updatedItems.forEach((item, i) => {
			if (item.OrderNumber) {
				item.OrderNumber = (i + 1).toString();
			}
		});

		const fieldName = isEnumerated ? 'EnumeratedItems' : 'CodeListItems';
		const originalValue = isEnumerated
			? (editableCodelist.EnumeratedItems || codelist.EnumeratedItems)
			: (editableCodelist.CodeListItems || codelist.CodeListItems);

		metadataEditState.recordChange(
			defineType,
			'codelists',
			codelist.OID,
			fieldName,
			updatedItems,
			originalValue
		);
	}

	// Drag and drop state
	let draggedIndex = $state<number | null>(null);
	let dropTargetIndex = $state<number | null>(null);

	// Delete modal state
	let showDeleteModal = $state(false);
	const isAlreadyDeleted = $derived(isItemDeleted(defineType, 'codelists', codelist?.OID));
	const deleteModalMode = $derived(isAlreadyDeleted ? 'reinstate' : 'delete');

	const impactedItemsForDelete = $derived.by(() => {
		return usedByVariables.map((item) => ({
			name: item.displayName,
			type: 'Variable',
			onClick: () => {
				if (item.variable.OID) {
					navigateToVariable(item.variable.OID);
					showDeleteModal = false;
				}
			}
		}));
	});

	function handleDeleteCodelist() {
		showDeleteModal = true;
	}

	function confirmDeleteCodelist() {
		handleDeleteOrReinstate(codelist, defineType, 'codelists', isAlreadyDeleted);
		showDeleteModal = false;
	}

	function cancelDeleteCodelist() {
		showDeleteModal = false;
	}

	function handleDragStart(event: DragEvent, index: number) {
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleDragEnd() {
		draggedIndex = null;
		dropTargetIndex = null;
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		if (draggedIndex !== null && draggedIndex !== index) {
			dropTargetIndex = index;
		}
	}

	function handleDragLeave() {
		dropTargetIndex = null;
	}

	function handleDrop(event: DragEvent, toIndex: number) {
		event.preventDefault();

		if (!codelist?.OID || !editableCodelist || draggedIndex === null) return;
		if (draggedIndex === toIndex) return;

		const items = [...codelistItems];
		const [movedItem] = items.splice(draggedIndex, 1);
		items.splice(toIndex, 0, movedItem);

		items.forEach((item, i) => {
			if (item.OrderNumber) {
				item.OrderNumber = (i + 1).toString();
			}
			if (item.Rank) {
				item.Rank = (i + 1).toString();
			}
		});

		const fieldName = isEnumerated ? 'EnumeratedItems' : 'CodeListItems';
		const originalValue = isEnumerated
			? (editableCodelist.EnumeratedItems || codelist.EnumeratedItems)
			: (editableCodelist.CodeListItems || codelist.CodeListItems);

		metadataEditState.recordChange(
			defineType,
			'codelists',
			codelist.OID,
			fieldName,
			items,
			originalValue
		);

		draggedIndex = null;
		dropTargetIndex = null;
	}
</script>

{#if codelist && editableCodelist}
	<div>
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center justify-between">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<span>CodeList</span>
					<span>›</span>
					<span>{codelist.OID}</span>
					{#if hasItemChanges(defineType, 'codelists', codelist.OID)}
						<span class="rounded-full bg-warning px-2 py-0.5 text-xs text-warning-foreground">Modified</span>
					{/if}
				</div>

				<!-- Delete/Reinstate button -->
				{#if metadataEditState.editMode}
					{#if isAlreadyDeleted}
						<button
							onclick={handleDeleteCodelist}
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
							onclick={handleDeleteCodelist}
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

			<!-- Editable Name -->
			{#if metadataEditState.editMode && !isAlreadyDeleted}
				<div class="mb-2">
					<EditableText
						value={editableCodelist.Name || ''}
						onSave={handleNameChange}
						placeholder="CodeList Name"
						className="text-2xl font-bold"
					/>
				</div>
			{:else}
				<h1 class="mb-2 text-2xl font-bold">{editableCodelist.Name || codelist.OID}</h1>
			{/if}

			<div class="flex gap-4 text-sm text-muted-foreground">
				<span>Type: {editableCodelist.DataType || 'text'}</span>
				{#if editableCodelist.SASFormatName}
					<span>SAS Format: {editableCodelist.SASFormatName}</span>
				{/if}
				{#if editableCodelist.StandardOID}
					<span>Standard: {editableCodelist.StandardOID}</span>
				{/if}
			</div>
		</div>

		<!-- CodeList Items -->
		<div class="mb-6 rounded-lg border bg-card">
			<div class="flex items-center justify-between border-b p-4">
				<h2 class="text-lg font-semibold">
					{isEnumerated ? 'Enumerated Values' : 'Coded Values'} ({codelistItems.length})
				</h2>
				{#if metadataEditState.editMode && !isAlreadyDeleted}
					<button
						onclick={addCodedValue}
						class="rounded bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90"
					>
						+ Add Row
					</button>
				{/if}
			</div>
			<div class="p-4">
				{#if codelistItems.length > 0}
					{#if metadataEditState.editMode && !isAlreadyDeleted}
						<!-- Editable table with drag-drop -->
						<div class="overflow-x-auto">
							<table class="w-full border-collapse">
								<thead>
									<tr class="border-b bg-muted/50">
										<th class="w-10 p-2 text-left text-xs font-medium"></th>
										<th class="w-16 p-2 text-left text-xs font-medium">Order</th>
										<th class="p-2 text-left text-xs font-medium">{isEnumerated ? 'Value' : 'Code'}</th>
										{#if !isEnumerated}
											<th class="p-2 text-left text-xs font-medium">Decode</th>
										{/if}
										<th class="w-20 p-2 text-left text-xs font-medium"></th>
									</tr>
								</thead>
								<tbody>
									{#each codelistItems as item, index (item.CodedValue ?? item.OrderNumber ?? index)}
										<tr
											draggable="true"
											ondragstart={(e) => handleDragStart(e, index)}
											ondragend={handleDragEnd}
											ondragover={(e) => handleDragOver(e, index)}
											ondragleave={handleDragLeave}
											ondrop={(e) => handleDrop(e, index)}
											class="border-b transition-colors hover:bg-muted/30
											       {draggedIndex === index ? 'opacity-50' : ''}
											       {dropTargetIndex === index ? 'border-l-4 border-primary bg-primary/5' : ''}"
										>
											<!-- Drag handle -->
											<td class="p-2">
												<div class="cursor-move text-muted-foreground">
													<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
														<path
															d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"
														/>
													</svg>
												</div>
											</td>

											<!-- Order/Rank -->
											<td class="p-2">
												<span class="text-sm text-muted-foreground">
													{item.OrderNumber || item.Rank || index + 1}
												</span>
											</td>

											<!-- CodedValue (editable) -->
											<td class="p-2">
												<EditableText
													value={item.CodedValue || ''}
													onSave={(val) => handleCodedValueChange(index, 'CodedValue', val)}
													placeholder={isEnumerated ? 'Value' : 'Code value'}
													className="font-mono"
												/>
												{#if item.ExtendedValue}
													<span class="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-400">
														Extended
													</span>
												{/if}
											</td>

											<!-- Decode (editable) -->
											{#if !isEnumerated}
												<td class="p-2">
													<EditableText
														value={item.Decode?.TranslatedText || ''}
														onSave={(val) => handleCodedValueChange(index, 'Decode', val)}
														placeholder="Decoded label"
													/>
												</td>
											{/if}

											<!-- Delete button -->
											<td class="p-2">
												<button
													onclick={() => deleteCodedValue(index)}
													class="rounded p-1 text-destructive hover:bg-destructive/10"
													title="Delete this coded value"
												>
													<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<!-- Read-only view -->
						<div class="space-y-2">
							{#each codelistItems as item}
								<div class="flex items-start gap-4 rounded-md border p-3">
									<div class="flex-shrink-0">
										<div class="rounded bg-primary/10 px-2 py-1 font-mono text-sm font-medium">
											{item.CodedValue}
											{#if item.ExtendedValue}
												<span class="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-400">Ext</span>
											{/if}
										</div>
									</div>
									<div class="flex-1">
										<div class="font-medium">
											{isEnumerated ? item.CodedValue : (item.Decode?.TranslatedText || item.CodedValue)}
										</div>
										{#if item.OrderNumber || item.Rank}
											<div class="text-xs text-muted-foreground">Order: {item.OrderNumber || item.Rank}</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{:else}
					<p class="text-sm text-muted-foreground">
						No coded values defined.
						{#if metadataEditState.editMode}
							Click "Add Row" to add one.
						{/if}
					</p>
				{/if}
			</div>
		</div>

		<!-- Used By -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">Used By ({usedByVariables.length} occurrences)</h2>
			</div>
			<div class="p-4">
				{#if usedByVariables.length > 0}
					<div class="space-y-1">
						{#each usedByVariables as { variable, dataset, displayName }}
							<button
								onclick={() => variable.OID && navigateToVariable(variable.OID)}
								class="w-full rounded border p-2 text-left transition-colors hover:bg-muted"
							>
								<div class="flex items-center justify-between gap-4">
									<div class="flex-1">
										<div class="text-sm font-medium">{displayName}</div>
									</div>
									<div class="flex-shrink-0">
										<span class="text-xs text-muted-foreground">
											{variable.DataType}
										</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">
						This codelist is not currently used by any variables.
					</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Delete Confirmation Modal -->
	<ConfirmDeleteModal
		open={showDeleteModal}
		mode={deleteModalMode}
		itemType="CodeList"
		itemName={editableCodelist.Name || codelist.OID || ''}
		impactedItems={impactedItemsForDelete}
		onConfirm={confirmDeleteCodelist}
		onCancel={cancelDeleteCodelist}
	/>
{:else}
	<div class="text-center">
		<h2 class="mb-4 text-xl font-bold">CodeList Not Found</h2>
		<p class="text-muted-foreground">
			The codelist with OID "{oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
