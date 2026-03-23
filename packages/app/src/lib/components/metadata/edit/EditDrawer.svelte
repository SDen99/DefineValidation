<script lang="ts">
	/**
	 * EditDrawer - Bottom sliding drawer for inline metadata editing
	 *
	 * Features:
	 * - Slides up from bottom with smooth animation
	 * - User-resizable with drag handle
	 * - Loads appropriate edit content based on item type
	 * - Escape key to close
	 * - Overlay background
	 */
	import { drawerState } from '$lib/core/state/metadata/drawerState.svelte';
	import VariableEditContent from './VariableEditContent.svelte';
	import MethodEditContent from './MethodEditContent.svelte';
	import CodelistEditContent from './CodelistEditContent.svelte';
	import CommentEditContent from './CommentEditContent.svelte';
	import DatasetEditContent from './DatasetEditContent.svelte';
	import * as appState from '$lib/core/state/appState.svelte.ts';

	// Calculate dynamic offsets based on sidebar state
	let leftOffset = $derived(appState.leftSidebarOpen.value ? appState.leftSidebarWidth.value : 0);
	// Edit History sidebar: full width when expanded, 40px (toggle button) when collapsed
	let rightOffset = $derived(appState.editHistorySidebarOpen.value ? appState.editHistorySidebarWidth.value : 40);

	// Resize state
	let isResizing = $state(false);
	let startY = $state(0);
	let startHeight = $state(0);

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isResizing) {
			drawerState.close();
		}
	}

	// Start resize
	function handleResizeStart(e: MouseEvent) {
		isResizing = true;
		startY = e.clientY;
		startHeight = drawerState.height;
		e.preventDefault();

		// Add global event listeners
		document.addEventListener('mousemove', handleResizeMove);
		document.addEventListener('mouseup', handleResizeEnd);
	}

	// Resize move
	function handleResizeMove(e: MouseEvent) {
		if (!isResizing) return;

		// Calculate new height (inverted because we're dragging from top)
		const deltaY = startY - e.clientY;
		const newHeight = startHeight + deltaY;
		drawerState.setHeight(newHeight);
	}

	// End resize
	function handleResizeEnd() {
		isResizing = false;
		document.removeEventListener('mousemove', handleResizeMove);
		document.removeEventListener('mouseup', handleResizeEnd);
	}

	// Clean up on destroy
	$effect(() => {
		return () => {
			document.removeEventListener('mousemove', handleResizeMove);
			document.removeEventListener('mouseup', handleResizeEnd);
		};
	});

	// Get title based on item type
	function getTitle(itemType: string): string {
		const titles: Record<string, string> = {
			variables: 'Variable',
			methods: 'Method',
			codelists: 'Codelist',
			comments: 'Comment',
			datasets: 'Dataset',
			whereclauses: 'Where Clause',
			valuelists: 'Value List',
			documents: 'Document',
			standards: 'Standard',
			dictionaries: 'Dictionary',
			analysisresults: 'Analysis Result'
		};
		return titles[itemType] || 'Edit Item';
	}

	// Handle confirmation for switching items
	function handleConfirmSwitch() {
		drawerState.confirmSwitch();
	}

	function handleCancelSwitch() {
		drawerState.cancelSwitch();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if drawerState.isOpen && drawerState.activeItem}
	<!-- Semi-transparent backdrop (very subtle) -->
	<div class="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px]" />

	<!-- Drawer -->
	<div
		class="fixed bottom-0 z-[45] flex flex-col border-t bg-background shadow-2xl transition-all duration-300"
		style="height: {drawerState.height}px; left: {leftOffset}px; right: {rightOffset}px; transform: translateY({drawerState.isOpen ? '0' : '100%'});"
	>
		<!-- Resize Handle -->
		<div
			class="group relative h-3 cursor-ns-resize border-b bg-muted/30 transition-colors hover:bg-muted/60"
			onmousedown={handleResizeStart}
			role="separator"
			aria-label="Resize drawer"
			tabindex="-1"
		>
			<!-- Visual handle indicator -->
			<div
				class="absolute left-1/2 top-1/2 h-1 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-muted-foreground/60"
			/>

			<!-- Resize cursor hint when dragging -->
			{#if isResizing}
				<div class="absolute inset-0 cursor-ns-resize" />
			{/if}
		</div>

		<!-- Header -->
		<div class="flex items-center justify-between border-b bg-muted/20 px-6 py-3">
			<div class="flex items-center gap-3">
				<h2 class="text-lg font-semibold text-foreground">
					{getTitle(drawerState.activeItem.itemType)}
				</h2>
				<span class="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
					{drawerState.activeItem.oid}
				</span>
				<span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
					{drawerState.activeItem.defineType.toUpperCase()}
				</span>
			</div>

			<!-- Close button -->
			<button
				onclick={() => drawerState.close()}
				class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				aria-label="Close drawer"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto">
			<div class="p-6">
				{#if drawerState.activeItem.itemType === 'variables'}
					<VariableEditContent
						oid={drawerState.activeItem.oid}
						defineType={drawerState.activeItem.defineType}
					/>
				{:else if drawerState.activeItem.itemType === 'methods'}
					<MethodEditContent
						oid={drawerState.activeItem.oid}
						defineType={drawerState.activeItem.defineType}
					/>
				{:else if drawerState.activeItem.itemType === 'codelists'}
					<CodelistEditContent
						oid={drawerState.activeItem.oid}
						defineType={drawerState.activeItem.defineType}
					/>
				{:else if drawerState.activeItem.itemType === 'comments'}
					<CommentEditContent
						oid={drawerState.activeItem.oid}
						defineType={drawerState.activeItem.defineType}
					/>
				{:else if drawerState.activeItem.itemType === 'datasets'}
					<DatasetEditContent
						oid={drawerState.activeItem.oid}
						defineType={drawerState.activeItem.defineType}
					/>
				{:else}
					<div class="rounded-lg border-2 border-dashed border-muted p-8 text-center">
						<p class="text-muted-foreground">
							Editing for {drawerState.activeItem.itemType} is not yet implemented
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Switch Confirmation Modal -->
{#if drawerState.pendingItem}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={handleCancelSwitch}
		role="button"
		tabindex="-1"
	>
		<div
			class="relative max-w-md rounded-lg bg-card p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
		>
			<h3 class="mb-4 text-lg font-semibold text-foreground">
				Switch Editing Item?
			</h3>
			<p class="mb-6 text-sm text-muted-foreground">
				Close editing <strong>{drawerState.activeItem ? getTitle(drawerState.activeItem.itemType) : 'item'}</strong> "{drawerState.activeItem?.oid}" and open <strong>{getTitle(drawerState.pendingItem.itemType)}</strong> "{drawerState.pendingItem.oid}"?
			</p>
			<div class="flex justify-end gap-3">
				<button
					onclick={handleCancelSwitch}
					class="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
				>
					Cancel
				</button>
				<button
					onclick={handleConfirmSwitch}
					class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
				>
					Switch
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Prevent text selection during resize */
	:global(body.resizing) {
		user-select: none;
		cursor: ns-resize !important;
	}
</style>
