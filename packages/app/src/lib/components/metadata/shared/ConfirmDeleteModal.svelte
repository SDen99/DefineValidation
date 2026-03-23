<script lang="ts">
	/**
	 * ConfirmDeleteModal - Modal for confirming deletion with impact analysis
	 */
	let {
		open = false,
		mode = 'delete',
		itemType = 'item',
		itemName = '',
		impactedItems = [],
		onConfirm,
		onCancel
	}: {
		open: boolean;
		mode?: 'delete' | 'reinstate';
		itemType: string;
		itemName: string;
		impactedItems: Array<{ name: string; type: string; onClick?: () => void }>;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onCancel();
		}
	}

	// Prevent clicks inside modal from closing it
	function handleModalClick(e: MouseEvent) {
		e.stopPropagation();
	}
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={onCancel}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
	>
		<!-- Modal -->
		<div
			class="relative max-h-[80vh] w-full max-w-lg overflow-hidden rounded-lg bg-card shadow-xl"
			onclick={handleModalClick}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			<!-- Header -->
			<div class="border-b p-6">
				<h2 id="modal-title" class="text-xl font-bold text-foreground">
					{#if mode === 'reinstate'}
						Reinstate {itemType}?
					{:else}
						Delete {itemType}?
					{/if}
				</h2>
			</div>

			<!-- Content -->
			<div class="max-h-96 overflow-y-auto p-6">
				{#if mode === 'reinstate'}
					<p class="mb-4 text-foreground">
						This {itemType} <strong>{itemName}</strong> has already been deleted.
					</p>
					<p class="mb-4 text-foreground">
						Would you like to reinstate it? This will undo the deletion and restore the {itemType}.
					</p>
				{:else}
					<p class="mb-4 text-foreground">
						Are you sure you want to delete <strong>{itemName}</strong>?
					</p>
				{/if}

				{#if impactedItems.length > 0 && mode === 'delete'}
					<div class="rounded-lg border-2 border-amber-500/50 bg-amber-500/10 p-4">
						<div class="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
							<span class="font-semibold">Warning: {impactedItems.length} item{impactedItems.length !== 1 ? 's' : ''} reference this {itemType}</span>
						</div>
						<p class="mb-3 text-sm text-amber-700 dark:text-amber-400">
							Deleting this {itemType} will leave the following items with broken references:
						</p>
						<div class="max-h-48 overflow-y-auto rounded border border-amber-500/30 bg-background">
							{#each impactedItems as item}
								<div class="border-b border-amber-500/20 last:border-b-0">
									{#if item.onClick}
										<button
											onclick={item.onClick}
											class="w-full p-2 text-left text-sm transition-colors hover:bg-amber-500/10"
										>
											<div class="font-medium">{item.name}</div>
											<div class="text-xs text-muted-foreground">{item.type}</div>
										</button>
									{:else}
										<div class="p-2">
											<div class="text-sm font-medium">{item.name}</div>
											<div class="text-xs text-muted-foreground">{item.type}</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{:else if mode === 'delete'}
					<div class="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
						This {itemType} is not currently referenced by any other items.
					</div>
				{/if}

				{#if mode === 'delete'}
					<p class="mt-4 text-sm text-muted-foreground">
						This action will be tracked and can be undone using the Undo button.
					</p>
				{:else}
					<p class="mt-4 text-sm text-muted-foreground">
						Reinstating will remove the deletion from your change history.
					</p>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-end gap-3 border-t p-6">
				<button
					onclick={onCancel}
					class="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
				>
					Cancel
				</button>
				{#if mode === 'reinstate'}
					<button
						onclick={onConfirm}
						class="rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-colors hover:bg-success/90"
					>
						Reinstate {itemType}
					</button>
				{:else}
					<button
						onclick={onConfirm}
						class="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
					>
						Delete {itemType}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
