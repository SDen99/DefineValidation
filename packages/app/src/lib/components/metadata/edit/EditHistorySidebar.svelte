<script lang="ts">
	/**
	 * EditHistorySidebar - Collapsible right sidebar displaying edit history with selective undo
	 */
	import type { ChangesData, DefineType, ItemType } from '$lib/core/state/metadata/editState.svelte';
	import { metadataEditState } from '$lib/core/state/metadata/editState.svelte';
	import EditHistoryItem from './EditHistoryItem.svelte';
	import { Button } from '@sden99/ui-components';
	import ResizeHandle from '$lib/components/layout/ResizeHandle.svelte';
	import * as appState from '$lib/core/state/appState.svelte.ts';

	// Get expand/collapse state and width from appState
	let isExpanded = $derived(appState.editHistorySidebarOpen.value);
	let currentWidth = $derived(appState.editHistorySidebarWidth.value);

	// Resize handler
	function handleResize(delta: number) {
		const newWidth = currentWidth + delta;
		// Clamp between min and max
		const clampedWidth = Math.max(200, Math.min(500, newWidth));
		appState.editHistorySidebarWidth.value = clampedWidth;
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

<!-- Sidebar Panel - Collapsible -->
<div
	class="fixed right-0 top-14 z-10 flex transition-all duration-300"
	style="height: calc(100vh - 3.5rem); width: {isExpanded ? `${currentWidth}px` : '2.5rem'};"
>
	<!-- Collapse/Expand Button -->
	<button
		onclick={() => appState.editHistorySidebarOpen.value = !appState.editHistorySidebarOpen.value}
		class="h-full w-10 border-l border-y border-border bg-muted/30 hover:bg-muted transition-colors flex items-center justify-center"
		title={isExpanded ? 'Collapse Edit History' : 'Expand Edit History'}
		aria-label={isExpanded ? 'Collapse Edit History' : 'Expand Edit History'}
	>
		<svg class="h-4 w-4 transition-transform duration-300" class:rotate-180={!isExpanded} fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
	</button>

	<!-- Sidebar Content -->
	{#if isExpanded}
		<!-- Resize Handle -->
		<ResizeHandle position="right" onResize={handleResize} />

		<div class="flex-1 border-l border-border bg-background shadow-xl">
			<div class="flex h-full flex-col">
				<!-- Header -->
				<div class="border-b border-border bg-card p-3">
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
		</div>

				<!-- Content -->
				<div class="flex-1 overflow-y-auto p-2">
			{#if hasChanges}
				<div class="space-y-3">
					{#each allChanges as { defineType, itemType, oid, changeRecord }}
						<EditHistoryItem {defineType} {itemType} {oid} {changeRecord} />
					{/each}
				</div>
			{:else}
				<!-- Empty State -->
				<div class="flex h-full flex-col items-center justify-center text-center">
					<div class="mb-2 text-4xl opacity-50">📝</div>
					<p class="text-sm font-medium text-foreground">No Changes Yet</p>
					<p class="mt-1 text-xs text-muted-foreground">
						Your edit history will appear here
					</p>
				</div>
			{/if}
		</div>

				<!-- Footer Info -->
				<div class="border-t border-border bg-muted/30 p-2 text-xs text-muted-foreground">
					<p>
						Click "Undo" to discard changes. Changes auto-save.
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
