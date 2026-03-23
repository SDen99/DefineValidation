<script lang="ts">
	import type { ItemDef } from '@sden99/cdisc-types/define-xml';
	import type { DefineType } from '$lib/core/state/metadata/editState.svelte';

	/**
	 * Variable Picker Modal
	 *
	 * Allows users to select existing variables to add to a dataset.
	 */

	interface Props {
		open: boolean;
		availableVariables: ItemDef[];
		excludeOIDs?: string[]; // Variables already in the dataset
		defineType: DefineType;
		onSelect: (variable: ItemDef) => void;
		onCancel: () => void;
	}

	let { open = $bindable(false), availableVariables, excludeOIDs = [], defineType, onSelect, onCancel }: Props = $props();

	// Search filter
	let searchText = $state('');

	// Filtered variables
	const filteredVariables = $derived.by(() => {
		let filtered = availableVariables.filter((v) => !excludeOIDs.includes(v.OID || ''));

		if (searchText.trim()) {
			const search = searchText.toLowerCase();
			filtered = filtered.filter(
				(v) =>
					v.Name?.toLowerCase().includes(search) ||
					v.OID?.toLowerCase().includes(search) ||
					v.Description?.toLowerCase().includes(search)
			);
		}

		return filtered.sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));
	});

	// Selected variable
	let selectedVariable = $state<ItemDef | null>(null);

	// Handle selection
	function handleSelect(variable: ItemDef) {
		selectedVariable = variable;
	}

	// Handle confirm
	function handleConfirm() {
		if (selectedVariable) {
			onSelect(selectedVariable);
			selectedVariable = null;
			searchText = '';
			open = false;
		}
	}

	// Handle cancel
	function handleCancel() {
		selectedVariable = null;
		searchText = '';
		onCancel();
	}

	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleCancel();
		} else if (event.key === 'Enter' && selectedVariable) {
			handleConfirm();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={(e) => e.target === e.currentTarget && handleCancel()}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="variable-picker-title"
		tabindex="-1"
	>
		<div class="w-full max-w-3xl rounded-lg border bg-card shadow-lg">
			<!-- Header -->
			<div class="border-b p-6">
				<h2 id="variable-picker-title" class="text-2xl font-bold">Add Variable to Dataset</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					Select a variable to add to this dataset
				</p>
			</div>

			<!-- Search -->
			<div class="border-b p-4">
				<input
					type="text"
					bind:value={searchText}
					placeholder="Search variables by name, OID, or description..."
					class="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					autofocus
				/>
			</div>

			<!-- Variable List -->
			<div class="max-h-96 overflow-y-auto p-4">
				{#if filteredVariables.length > 0}
					<div class="space-y-1">
						{#each filteredVariables as variable (variable.OID)}
							<button
								onclick={() => handleSelect(variable)}
								class="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted
									{selectedVariable?.OID === variable.OID ? 'border-primary bg-primary/10' : ''}"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="flex items-center gap-2">
											<span class="font-medium">{variable.Name || variable.OID}</span>
											{#if variable.DataType}
												<span class="rounded bg-muted px-2 py-0.5 text-xs font-medium">
													{variable.DataType}
												</span>
											{/if}
										</div>
										{#if variable.Description}
											<p class="mt-1 text-sm text-muted-foreground line-clamp-1">
												{variable.Description}
											</p>
										{/if}
										<div class="mt-1 text-xs text-muted-foreground">
											OID: {variable.OID}
											{#if variable.Length}
												• Length: {variable.Length}
											{/if}
										</div>
									</div>
									{#if selectedVariable?.OID === variable.OID}
										<svg
											class="h-5 w-5 text-primary"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											/>
										</svg>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<div class="py-12 text-center">
						<p class="text-muted-foreground">
							{searchText
								? 'No variables found matching your search'
								: 'No variables available to add'}
						</p>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between border-t p-4">
				<div class="text-sm text-muted-foreground">
					{#if selectedVariable}
						Selected: <span class="font-medium">{selectedVariable.Name || selectedVariable.OID}</span>
					{:else}
						{filteredVariables.length} variable{filteredVariables.length !== 1 ? 's' : ''} available
					{/if}
				</div>
				<div class="flex gap-2">
					<button
						onclick={handleCancel}
						class="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
					>
						Cancel
					</button>
					<button
						onclick={handleConfirm}
						disabled={!selectedVariable}
						class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Add Variable
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
