<script lang="ts">
	/**
	 * MethodEditContent - Reusable component for editing method metadata
	 */
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';
	import { metadataEditState, type DefineType } from '$lib/core/state/metadata/editState.svelte';
	import EditableText from './EditableText.svelte';
	import EditableTextArea from './EditableTextArea.svelte';
	import ConfirmDeleteModal from '../shared/ConfirmDeleteModal.svelte';
	import type { Method } from '@sden99/cdisc-types/define-xml';
	import { goto } from '$app/navigation';
	import { mergeItemWithChanges, recordFieldChange } from '$lib/utils/metadata/useEditableItem.svelte';
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
	const activeDefineData = $derived(
		defineType === 'adam'
			? defineBundle.adamData?.defineData
			: defineBundle.sdtmData?.defineData
	);

	// Find the method
	const method = $derived(
		activeDefineData?.Methods?.find((m) => m.OID === oid)
	);

	// Editable state
	const editableMethod = $derived.by(() =>
		mergeItemWithChanges(method, defineType, 'methods', method?.OID)
	);

	// Field change handlers
	function handleFieldChange(fieldName: keyof Method, newValue: any) {
		recordFieldChange(method, defineType, 'methods', fieldName, newValue);
	}

	// Delete modal state
	let showDeleteModal = $state(false);
	const isAlreadyDeleted = $derived(isItemDeleted(defineType, 'methods', method?.OID));
	const deleteModalMode = $derived(isAlreadyDeleted ? 'reinstate' : 'delete');

	function handleDeleteMethod() {
		showDeleteModal = true;
	}

	function confirmDeleteMethod() {
		handleDeleteOrReinstate(method, defineType, 'methods', isAlreadyDeleted);
		showDeleteModal = false;
	}

	function cancelDeleteMethod() {
		showDeleteModal = false;
	}

	// Navigation helper
	function navigateToVariable(oid: string) {
		goto(`/metadata/variables/${oid}`);
	}

	// Find variables that use this method
	const usedByVariables = $derived.by(() => {
		if (!activeDefineData) return [];

		const variableOIDs = new Set<string>();

		activeDefineData.ItemGroups?.forEach((ig) => {
			ig.ItemRefs?.forEach((ref) => {
				if (ref.MethodOID === oid && ref.OID) {
					variableOIDs.add(ref.OID);
				}
			});
		});

		const variables = Array.from(variableOIDs)
			.map((varOid) => activeDefineData.ItemDefs?.find((item) => item.OID === varOid))
			.filter((v) => v != null);

		return variables.flatMap((variable) => {
			const datasetsUsingVariable = activeDefineData.ItemGroups?.filter((ig) =>
				ig.ItemRefs?.some((ref) => ref.OID === variable.OID)
			) || [];

			return datasetsUsingVariable.map((dataset) => ({
				variable,
				dataset,
				displayName: `${variable.Name} in ${dataset.Name || dataset.OID}`
			}));
		});
	});
</script>

{#if method}
	<div>
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
				<span>Method</span>
				<span>›</span>
				<span>{method.OID}</span>
				{#if isAlreadyDeleted}
					<span class="ml-2 rounded bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
						Deleted
					</span>
				{/if}
			</div>
			<div class="flex items-center justify-between">
				<div class="flex-1">
					<h1 class="mb-2 text-2xl font-bold">
						<EditableText
							value={editableMethod?.Name || method.OID || ''}
							onSave={(v) => handleFieldChange('Name', v)}
							disabled={!metadataEditState.editMode || isAlreadyDeleted}
							placeholder="Method Name"
						/>
					</h1>
					<div class="text-sm text-muted-foreground">
						Type:
						<EditableText
							value={editableMethod?.Type || ''}
							onSave={(v) => handleFieldChange('Type', v)}
							disabled={!metadataEditState.editMode || isAlreadyDeleted}
							placeholder="Method Type (e.g., Computation, Imputation)"
							className="inline"
						/>
					</div>
				</div>
				{#if metadataEditState.editMode}
					<button
						onclick={handleDeleteMethod}
						class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
						       {isAlreadyDeleted
							? 'bg-success text-success-foreground hover:bg-success/90'
							: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}"
					>
						{#if isAlreadyDeleted}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
							Reinstate
						{:else}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
							Delete
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<!-- Description -->
		<div class="mb-6 rounded-lg border bg-card p-4">
			<h2 class="mb-2 text-lg font-semibold">Description</h2>
			<EditableTextArea
				value={editableMethod?.Description || ''}
				onSave={(v) => handleFieldChange('Description', v)}
				disabled={!metadataEditState.editMode || isAlreadyDeleted}
				placeholder="Method description"
				rows={5}
			/>
		</div>

		<!-- Additional Fields -->
		{#if metadataEditState.editMode || editableMethod?.Document || editableMethod?.Pages || editableMethod?.TranslatedText}
			<div class="mb-6 rounded-lg border bg-card p-4">
				<h2 class="mb-4 text-lg font-semibold">Additional Information</h2>
				<div class="space-y-4">
					<div>
						<label class="mb-1 block text-sm font-medium">Document Reference</label>
						<EditableText
							value={editableMethod?.Document || ''}
							onSave={(v) => handleFieldChange('Document', v)}
							disabled={!metadataEditState.editMode || isAlreadyDeleted}
							placeholder="Document reference (optional)"
						/>
					</div>

					<div>
						<label class="mb-1 block text-sm font-medium">Pages</label>
						<EditableText
							value={editableMethod?.Pages || ''}
							onSave={(v) => handleFieldChange('Pages', v)}
							disabled={!metadataEditState.editMode || isAlreadyDeleted}
							placeholder="Page numbers (optional)"
						/>
					</div>

					<div>
						<label class="mb-1 block text-sm font-medium">Translated Text</label>
						<EditableTextArea
							value={editableMethod?.TranslatedText || ''}
							onSave={(v) => handleFieldChange('TranslatedText', v)}
							disabled={!metadataEditState.editMode || isAlreadyDeleted}
							placeholder="Translated text (optional)"
							rows={3}
						/>
					</div>
				</div>
			</div>
		{/if}

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
						This method is not currently used by any variables.
					</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Delete Confirmation Modal -->
	{#if showDeleteModal}
		<ConfirmDeleteModal
			open={showDeleteModal}
			itemName={method.Name || method.OID || 'this method'}
			itemType="method"
			mode={deleteModalMode}
			impactedItems={usedByVariables.map((item) => ({
				name: item.displayName,
				type: 'variable'
			}))}
			onConfirm={confirmDeleteMethod}
			onCancel={cancelDeleteMethod}
		/>
	{/if}
{:else}
	<div class="text-center">
		<h2 class="mb-4 text-xl font-bold">Method Not Found</h2>
		<p class="text-muted-foreground">
			The method with OID "{oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
