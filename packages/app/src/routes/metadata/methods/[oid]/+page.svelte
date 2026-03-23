<script lang="ts">
	import { page } from '$app/stores';
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';
	import { metadataEditState, type DefineType } from '$lib/core/state/metadata/editState.svelte';
	import EditableText from '$lib/components/metadata/edit/EditableText.svelte';
	import EditableTextArea from '$lib/components/metadata/edit/EditableTextArea.svelte';
	import ConfirmDeleteModal from '$lib/components/metadata/shared/ConfirmDeleteModal.svelte';
	import type { Method } from '@sden99/cdisc-types/define-xml';
	import { goto } from '$app/navigation';

	// Import shared utilities
	import { mergeItemWithChanges, recordFieldChange } from '$lib/utils/metadata/useEditableItem.svelte';
	import { isItemDeleted, handleDeleteOrReinstate } from '$lib/utils/metadata/useDeleteModal.svelte';

	// Extract Define-XML data
	const defineBundle = $derived(extractDefineDataForMetadata());

	// Determine define type and get active defineData
	const defineType = $derived<DefineType>((defineBundle.adamData ? 'adam' : 'sdtm'));
	const activeDefineData = $derived(
		defineType === 'adam'
			? defineBundle.adamData?.defineData
			: defineBundle.sdtmData?.defineData
	);

	// Navigation helper
	function navigateToVariable(oid: string) {
		goto(`/metadata/variables/${oid}`);
	}

	// Find the method
	const method = $derived(
		activeDefineData?.Methods?.find((m) => m.OID === $page.params.oid)
	);

	// Use shared utility for editable state
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

	// Delete action handlers
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

	// Find variables that use this method
	const usedByVariables = $derived.by(() => {
		if (!activeDefineData) return [];

		const variableOIDs = new Set<string>();

		// Check ItemRefs for methods
		activeDefineData.ItemGroups?.forEach((ig) => {
			ig.ItemRefs?.forEach((ref) => {
				if (ref.MethodOID === $page.params.oid && ref.OID) {
					variableOIDs.add(ref.OID);
				}
			});
		});

		// Get the actual ItemDefs
		const variables = Array.from(variableOIDs)
			.map((oid) => activeDefineData.ItemDefs?.find((item) => item.OID === oid))
			.filter((v) => v != null);

		// For each variable, find which datasets use it
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
	<div class="mx-auto max-w-4xl p-6">
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
					<h1 class="mb-2 text-3xl font-bold">
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
						class="rounded px-3 py-1 text-sm transition-colors
						       {isAlreadyDeleted
							? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
							: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}"
					>
						{isAlreadyDeleted ? 'Reinstate' : 'Delete'}
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

		<!-- Additional Fields (Document, Pages, TranslatedText) -->
		{#if metadataEditState.editMode || editableMethod?.Document || editableMethod?.Pages || editableMethod?.TranslatedText}
			<div class="mb-6 rounded-lg border bg-card p-4">
				<h2 class="mb-4 text-lg font-semibold">Additional Information</h2>
				<div class="space-y-4">
					<!-- Document -->
					<div>
						<label class="mb-1 block text-sm font-medium">Document Reference</label>
						<EditableText
							value={editableMethod?.Document || ''}
							onSave={(v) => handleFieldChange('Document', v)}
							disabled={!metadataEditState.editMode || isAlreadyDeleted}
							placeholder="Document reference (optional)"
						/>
					</div>

					<!-- Pages -->
					<div>
						<label class="mb-1 block text-sm font-medium">Pages</label>
						<EditableText
							value={editableMethod?.Pages || ''}
							onSave={(v) => handleFieldChange('Pages', v)}
							disabled={!metadataEditState.editMode || isAlreadyDeleted}
							placeholder="Page numbers (optional)"
						/>
					</div>

					<!-- TranslatedText -->
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

		<!-- Used By (Variables) -->
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
	<div class="mx-auto max-w-2xl p-8 text-center">
		<h1 class="mb-4 text-2xl font-bold">Method Not Found</h1>
		<p class="text-muted-foreground">
			The method with OID "{$page.params.oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
