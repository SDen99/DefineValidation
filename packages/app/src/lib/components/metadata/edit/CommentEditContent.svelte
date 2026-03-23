<script lang="ts">
	/**
	 * CommentEditContent - Reusable component for editing comment metadata
	 */
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';
	import { metadataEditState, type DefineType } from '$lib/core/state/metadata/editState.svelte';
	import EditableTextArea from './EditableTextArea.svelte';
	import ConfirmDeleteModal from '../shared/ConfirmDeleteModal.svelte';
	import { mergeItemWithChanges, recordFieldChange } from '$lib/utils/metadata/useEditableItem.svelte';
	import { isItemDeleted, handleDeleteOrReinstate } from '$lib/utils/metadata/useDeleteModal.svelte';
	import { goto } from '$app/navigation';

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

	// Navigation helpers
	function navigateToVariable(oid: string) {
		goto(`/metadata/variables/${oid}`);
	}

	function navigateToDataset(oid: string) {
		goto(`/metadata/datasets/${oid}`);
	}

	// Find the comment
	const comment = $derived(
		activeDefineData.Comments?.find((c) => c.OID === oid)
	);

	// Editable state
	const editableComment = $derived.by(() =>
		mergeItemWithChanges(comment, defineType, 'comments', comment?.OID)
	);

	// Field change handler
	function handleDescriptionChange(newDescription: string) {
		recordFieldChange(comment, defineType, 'comments', 'Description', newDescription);
	}

	// Delete modal state
	let showDeleteModal = $state(false);
	const isAlreadyDeleted = $derived(isItemDeleted(defineType, 'comments', comment?.OID));
	const deleteModalMode = $derived(isAlreadyDeleted ? 'reinstate' : 'delete');

	function handleDeleteComment() {
		showDeleteModal = true;
	}

	function confirmDeleteComment() {
		handleDeleteOrReinstate(comment, defineType, 'comments', isAlreadyDeleted);
		showDeleteModal = false;
	}

	function cancelDeleteComment() {
		showDeleteModal = false;
	}

	// Find items that reference this comment
	const usedByItems = $derived.by(() => {
		const items: Array<{
			type: 'variable' | 'dataset';
			item: any;
			displayName: string;
			sublabel: string;
		}> = [];

		// Check ItemDefs (variables) that reference this comment
		activeDefineData.ItemDefs?.forEach((itemDef) => {
			if (itemDef.CommentOID === oid) {
				const datasetsUsingVariable = activeDefineData.ItemGroups?.filter((ig) =>
					ig.ItemRefs?.some((ref) => ref.OID === itemDef.OID)
				) || [];

				datasetsUsingVariable.forEach((dataset) => {
					items.push({
						type: 'variable',
						item: itemDef,
						displayName: `${itemDef.Name || itemDef.OID} in ${dataset.Name || dataset.OID}`,
						sublabel: `Variable (${itemDef.DataType})`
					});
				});
			}
		});

		// Check ItemGroups (datasets) that reference this comment
		activeDefineData.ItemGroups?.forEach((itemGroup) => {
			if (itemGroup.CommentOID === oid) {
				items.push({
					type: 'dataset',
					item: itemGroup,
					displayName: itemGroup.Name || itemGroup.OID || 'Unknown',
					sublabel: `Dataset (${itemGroup.ItemRefs?.length || 0} variables)`
				});
			}
		});

		return items;
	});
</script>

{#if comment}
	<div>
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
				<span>Comment</span>
				<span>›</span>
				<span>{comment.OID}</span>
				{#if isAlreadyDeleted}
					<span class="ml-2 rounded bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
						Deleted
					</span>
				{/if}
			</div>
			<div class="flex items-center justify-between">
				<h1 class="mb-2 text-2xl font-bold">{comment.OID}</h1>
				{#if metadataEditState.editMode}
					<button
						onclick={handleDeleteComment}
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

		<!-- Comment Text -->
		<div class="mb-6 rounded-lg border bg-card p-4">
			<h2 class="mb-2 text-lg font-semibold">Comment Text</h2>
			<EditableTextArea
				value={editableComment?.Description || ''}
				onSave={handleDescriptionChange}
				disabled={!metadataEditState.editMode || isAlreadyDeleted}
				placeholder="No comment text available"
				rows={5}
			/>
		</div>

		<!-- Used By -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">Used By ({usedByItems.length} references)</h2>
			</div>
			<div class="p-4">
				{#if usedByItems.length > 0}
					<div class="space-y-1">
						{#each usedByItems as { type, item, displayName, sublabel }}
							<button
								onclick={() => item.OID && (type === 'variable' ? navigateToVariable(item.OID) : navigateToDataset(item.OID))}
								class="w-full rounded border p-2 text-left transition-colors hover:bg-muted"
							>
								<div class="flex items-center justify-between gap-4">
									<div class="flex-1">
										<div class="text-sm font-medium">{displayName}</div>
									</div>
									<div class="flex-shrink-0">
										<span class="text-xs text-muted-foreground">
											{sublabel}
										</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">
						This comment is not currently referenced by any items.
					</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Delete Confirmation Modal -->
	{#if showDeleteModal}
		<ConfirmDeleteModal
			open={showDeleteModal}
			itemName={comment.OID || 'this comment'}
			itemType="comment"
			mode={deleteModalMode}
			impactedItems={usedByItems.map((item) => ({
				name: item.displayName,
				type: item.type
			}))}
			onConfirm={confirmDeleteComment}
			onCancel={cancelDeleteComment}
		/>
	{/if}
{:else}
	<div class="text-center">
		<h2 class="mb-4 text-xl font-bold">Comment Not Found</h2>
		<p class="text-muted-foreground">
			The comment with OID "{oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
