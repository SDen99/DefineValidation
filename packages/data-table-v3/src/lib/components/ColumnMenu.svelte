<script lang="ts">
	import type { ColumnConfig } from '../types/columns';

	interface Props {
		columns: ColumnConfig[];
		onToggleColumn?: (columnId: string) => void;
		onShowAll?: () => void;
		onHideAll?: () => void;
		onResetColumns?: () => void;
	}

	let { columns, onToggleColumn, onShowAll, onHideAll, onResetColumns }: Props = $props();

	// Menu state
	let isOpen = $state(false);
	let searchTerm = $state('');

	// Filtered columns based on search
	const filteredColumns = $derived.by(() => {
		if (!searchTerm) return columns;
		const term = searchTerm.toLowerCase();
		return columns.filter((col) => col.header.toLowerCase().includes(term));
	});

	// Visible count
	const visibleCount = $derived(columns.filter((c) => c.visible).length);

	/**
	 * Toggle menu visibility
	 */
	function toggleMenu() {
		isOpen = !isOpen;
		if (!isOpen) {
			searchTerm = ''; // Reset search when closing
		}
	}

	/**
	 * Close menu when clicking outside
	 */
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.column-menu-container')) {
			isOpen = false;
			searchTerm = '';
		}
	}

	/**
	 * Handle column toggle
	 */
	function handleToggle(columnId: string) {
		if (onToggleColumn) {
			onToggleColumn(columnId);
		}
	}

	/**
	 * Handle show all
	 */
	function handleShowAll() {
		if (onShowAll) {
			onShowAll();
		}
	}

	/**
	 * Handle hide all
	 */
	function handleHideAll() {
		if (onHideAll) {
			onHideAll();
		}
	}

	/**
	 * Handle reset
	 */
	function handleReset() {
		if (onResetColumns) {
			onResetColumns();
		}
	}

	/**
	 * Setup click outside listener
	 */
	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
</script>

<div class="column-menu-container relative inline-block">
	<!-- Menu Button -->
	<button
		onclick={toggleMenu}
		class="px-3 py-2 bg-background border border-border rounded-md shadow-sm text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
		aria-label="Column menu"
		aria-expanded={isOpen}
	>
		<div class="flex items-center gap-2">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
				/>
			</svg>
			<span>Columns</span>
			<span class="text-xs text-muted-foreground">({visibleCount}/{columns.length})</span>
		</div>
	</button>

	<!-- Dropdown Menu -->
	{#if isOpen}
		<div
			class="absolute right-0 mt-2 w-80 bg-background rounded-lg shadow-lg border border-border z-50 max-h-96 overflow-hidden flex flex-col"
		>
			<!-- Header -->
			<div class="px-4 py-3 border-b border-border">
				<h3 class="text-sm font-semibold text-foreground">Manage Columns</h3>
				<p class="text-xs text-muted-foreground mt-1">Show or hide table columns</p>
			</div>

			<!-- Search -->
			<div class="px-4 py-3 border-b border-border">
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search columns..."
					class="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			<!-- Quick Actions -->
			<div class="px-4 py-2 border-b border-border flex gap-2">
				<button
					onclick={handleShowAll}
					class="flex-1 px-2 py-1 text-xs bg-info text-info-foreground rounded hover:bg-info/90 transition-colors"
				>
					Show All
				</button>
				<button
					onclick={handleHideAll}
					class="flex-1 px-2 py-1 text-xs bg-muted-foreground text-background rounded hover:bg-muted-foreground/90 transition-colors"
				>
					Hide All
				</button>
				<button
					onclick={handleReset}
					class="flex-1 px-2 py-1 text-xs bg-warning text-warning-foreground rounded hover:bg-warning/90 transition-colors"
				>
					Reset
				</button>
			</div>

			<!-- Column List -->
			<div class="overflow-y-auto flex-1">
				{#if filteredColumns.length > 0}
					<div class="px-4 py-2 space-y-1">
						{#each filteredColumns as column (column.id)}
							<label
								class="flex items-center gap-3 px-2 py-2 rounded hover:bg-muted cursor-pointer transition-colors"
							>
								<input
									type="checkbox"
									checked={column.visible}
									onchange={() => handleToggle(column.id)}
									class="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-ring"
								/>
								<span class="text-sm text-foreground flex-1">{column.header}</span>
								{#if column.visible}
									<span class="text-xs text-success font-medium">Visible</span>
								{:else}
									<span class="text-xs text-muted-foreground">Hidden</span>
								{/if}
							</label>
						{/each}
					</div>
				{:else}
					<div class="px-4 py-8 text-center text-sm text-muted-foreground">
						No columns found matching "{searchTerm}"
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-4 py-3 border-t border-border bg-muted">
				<p class="text-xs text-muted-foreground">
					{visibleCount} of {columns.length} columns visible
				</p>
			</div>
		</div>
	{/if}
</div>

<style>
	input[type='checkbox'] {
		accent-color: hsl(var(--color-primary));
	}

	/* Smooth transitions */
	button,
	label {
		transition: all 0.15s ease;
	}
</style>
