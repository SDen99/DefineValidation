<script lang="ts">
	/**
	 * EditHistoryItem - Displays all changes for a single item with undo button
	 */
	import type { ChangeRecord, DefineType, ItemType } from '$lib/core/state/metadata/editState.svelte';
	import { metadataEditState } from '$lib/core/state/metadata/editState.svelte';
	import FieldChangeDisplay from './FieldChangeDisplay.svelte';
	import { Button } from '@sden99/ui-components';
	import { Badge } from '@sden99/ui-components';

	let {
		defineType,
		itemType,
		oid,
		changeRecord
	}: {
		defineType: DefineType;
		itemType: ItemType;
		oid: string;
		changeRecord: ChangeRecord;
	} = $props();

	// Format item type for display
	const itemTypeLabel = $derived(itemType.charAt(0).toUpperCase() + itemType.slice(1, -1)); // Remove plural 's'

	// Format timestamp
	const timestamp = $derived(new Date(changeRecord.timestamp).toLocaleString());

	// Get field changes for MODIFIED items
	const fieldChanges = $derived(
		changeRecord.type === 'MODIFIED' && changeRecord.originalValues
			? Object.keys(changeRecord.changes)
			: []
	);

	// Badge variant based on change type
	const badgeVariant = $derived(
		changeRecord.type === 'ADDED'
			? 'default'
			: changeRecord.type === 'DELETED'
				? 'destructive'
				: 'secondary'
	);

	function handleUndoItem() {
		if (confirm(`Undo all changes to this ${itemTypeLabel.toLowerCase()}?`)) {
			metadataEditState.discardItemChanges(defineType, itemType, oid);
		}
	}
</script>

<div class="rounded-lg border border-border bg-card p-3 shadow-sm">
	<!-- Header -->
	<div class="mb-2 flex items-start justify-between gap-2">
		<div class="flex-1 space-y-1">
			<div class="flex items-center gap-2">
				<Badge variant={badgeVariant}>{changeRecord.type}</Badge>
				<span class="font-medium text-foreground">{itemTypeLabel}</span>
			</div>
			<div class="font-mono text-xs text-muted-foreground">{oid}</div>
			<div class="text-xs text-muted-foreground">{timestamp}</div>
		</div>
		<Button variant="destructive" size="sm" onclick={handleUndoItem}>
			Undo
		</Button>
	</div>

	<!-- Change Details -->
	{#if changeRecord.type === 'MODIFIED'}
		{#if fieldChanges.length > 0}
			<div class="mt-3 space-y-2">
				<div class="text-xs font-medium text-muted-foreground">
					Modified Fields ({fieldChanges.length}):
				</div>
				{#each fieldChanges as fieldName}
					<FieldChangeDisplay
						{fieldName}
						oldValue={changeRecord.originalValues?.[fieldName]}
						newValue={changeRecord.changes[fieldName]}
					/>
				{/each}
			</div>
		{/if}
	{:else if changeRecord.type === 'ADDED'}
		<div class="mt-2 text-sm text-muted-foreground">Item will be added to metadata</div>
	{:else if changeRecord.type === 'DELETED'}
		<div class="mt-2 text-sm text-muted-foreground">Item marked for deletion</div>
	{/if}
</div>
