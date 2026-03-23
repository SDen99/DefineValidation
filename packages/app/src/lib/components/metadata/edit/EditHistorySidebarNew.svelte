<script lang="ts">
	/**
	 * EditHistorySidebar - Edit history sidebar using UnifiedSidebar
	 */
	import type { ChangesData, DefineType, ItemType } from '$lib/core/state/metadata/editState.svelte';
	import { metadataEditState } from '$lib/core/state/metadata/editState.svelte';
	import EditHistoryItem from './EditHistoryItem.svelte';
	import { Button } from '@sden99/ui-components';
	import UnifiedSidebar from '$lib/components/layout/UnifiedSidebar.svelte';
	import * as appState from '$lib/core/state/appState.svelte.ts';

	// Get expand/collapse state and width from appState
	let isExpanded = $derived(appState.editHistorySidebarOpen.value);
	let currentWidth = $derived(appState.editHistorySidebarWidth.value);

	// Optimized resize handler - directly update appState
	function handleResize(delta: number) {
		appState.editHistorySidebarWidth.value = Math.max(
			200,
			Math.min(500, appState.editHistorySidebarWidth.value + delta)
		);
	}

	// Toggle handler
	function handleToggle() {
		appState.editHistorySidebarOpen.value = !appState.editHistorySidebarOpen.value;
	}

	// Get all changes organized by item
	interface ItemChange {
		defineType: DefineType;
		itemType: ItemType;
		oid: string;
		changeRecord: any;
	}

	const allChanges = $derived.by(() => {
		const items: ItemChange[] = [];
		const changes: ChangesData = metadataEditState.changes;

		for (const defineType in changes) {
			for (const itemType in changes[defineType]) {
				for (const oid in changes[defineType][itemType]) {
					items.push({
						defineType: defineType as DefineType,
						itemType: itemType as ItemType,
						oid,
						changeRecord: changes[defineType][itemType][oid]
					});
				}
			}
		}

		// Sort by timestamp (most recent first)
		items.sort((a, b) => {
			const timeA = new Date(a.changeRecord.timestamp).getTime();
			const timeB = new Date(b.changeRecord.timestamp).getTime();
			return timeB - timeA;
		});

		return items;
	});

	const totalChanges = $derived(metadataEditState.getTotalChanges());
	const hasChanges = $derived(totalChanges > 0);

	function handleClearAll() {
		if (
			confirm(
				`Are you sure you want to clear all ${totalChanges} change${totalChanges !== 1 ? 's' : ''}? This cannot be undone.`
			)
		) {
			metadataEditState.clearChanges();
		}
	}
</script>

<!-- Use UnifiedSidebar with fixed positioning wrapper -->
<!-- Use flex layout to let UnifiedSidebar control its own width -->
<div
	class="fixed right-0 top-14 z-50 flex"
	style="height: calc(100vh - 3.5rem);"
>
	<UnifiedSidebar
		position="right"
		open={isExpanded}
		width={currentWidth}
		onToggle={handleToggle}
		onResize={handleResize}
		isEmpty={!hasChanges}
		minWidth={200}
		maxWidth={500}
		bgClass="bg-background shadow-xl border-l border-border"
	>
		{#snippet headerContent()}
			<div>
				<h2 class="text-base font-semibold">Edit History</h2>
				<p class="mt-1 text-xs text-muted-foreground">
					{totalChanges} change{totalChanges !== 1 ? 's' : ''}
				</p>
			</div>
			{#if hasChanges}
				<div class="mt-3">
					<Button variant="destructive" size="sm" onclick={handleClearAll} class="w-full">
						Clear All Changes
					</Button>
				</div>
				<!-- Edit Count Badge -->
				<div class="mt-3 flex items-center justify-center">
					<span
						class="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-2 text-sm font-semibold text-primary-foreground"
					>
						{totalChanges}
					</span>
				</div>
			{/if}
		{/snippet}

		{#snippet sidebarContent()}
			<div class="space-y-3 pt-2">
				{#each allChanges as { defineType, itemType, oid, changeRecord }}
					<EditHistoryItem {defineType} {itemType} {oid} {changeRecord} />
				{/each}
			</div>
			<!-- Footer Info -->
			<div class="mt-4 border-t border-border bg-muted/30 p-2 text-xs text-muted-foreground">
				<p>
					Click "Undo" to discard changes. Changes auto-save.
				</p>
			</div>
		{/snippet}

		{#snippet emptyState()}
			<div class="flex flex-col items-center justify-center text-center">
				<div class="mb-2 text-4xl opacity-50">📝</div>
				<p class="text-sm font-medium text-foreground">No Changes Yet</p>
				<p class="mt-1 text-xs text-muted-foreground">
					Your edit history will appear here
				</p>
			</div>
		{/snippet}
	</UnifiedSidebar>
</div>
