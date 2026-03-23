<script lang="ts">
	let {
		label,
		sublabel = null,
		level = 0,
		isExpanded = false,
		isSelected = false,
		onClick = null,
		onToggle = null,
		count = null,
		totalCount = null,
		isFiltered = false,
		leafId = null,
		isModified = false,
		isDeleted = false
	}: {
		label: string;
		sublabel?: string | null;
		level?: number;
		isExpanded?: boolean;
		isSelected?: boolean;
		onClick?: (() => void) | null;
		onToggle?: (() => void) | null;
		count?: number | null;
		totalCount?: number | null;
		isFiltered?: boolean;
		leafId?: string | null;
		isModified?: boolean;
		isDeleted?: boolean;
	} = $props();

	const paddingLeft = $derived(level * 12 + 8);
	const hasChildren = $derived(onToggle !== null);
	const isClickable = $derived(onClick !== null);

	function handleChevronClick(e: MouseEvent) {
		e.stopPropagation(); // Prevent triggering label click
		if (onToggle) {
			onToggle();
		}
	}

	function handleLabelClick() {
		// If there's an onClick handler (navigation), use it
		if (onClick) {
			onClick();
		}
		// Otherwise, if this is a section with children, toggle it
		else if (onToggle) {
			onToggle();
		}
	}
</script>

<button
	onclick={handleLabelClick}
	class="group w-full max-w-full overflow-hidden text-left transition-colors {isSelected ? 'bg-primary/10' : ''} {isClickable || hasChildren ? 'cursor-pointer' : ''}"
	data-leaf-id={leafId}
	type="button"
>
	<div class="flex items-center gap-2 overflow-hidden px-2 py-1" style="padding-left: {paddingLeft}px">
		<!-- Expand/collapse chevron for sections with children -->
		{#if hasChildren}
			<span
				role="button"
				tabindex="0"
				onclick={handleChevronClick}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						handleChevronClick(e as unknown as MouseEvent);
					}
				}}
				class="text-xs transition-transform hover:text-primary cursor-pointer"
				class:rotate-90={isExpanded}
			>
				▶
			</span>
		{:else}
			<span class="w-3"></span>
		{/if}

		<!-- Label and sublabel inline -->
		<div class="min-w-0 flex-1 flex items-center gap-2">
			<!-- Status indicator dot -->
			{#if isDeleted}
				<span
					class="h-2 w-2 rounded-full bg-red-500"
					title="This item has been deleted"
				></span>
			{:else if isModified}
				<span
					class="h-2 w-2 rounded-full bg-orange-500"
					title="This item has been modified"
				></span>
			{/if}

			<span
				class="truncate text-sm font-medium"
				class:text-primary={isSelected}
				class:text-foreground={!isSelected && !isDeleted}
				class:text-muted-foreground={isDeleted}
				class:line-through={isDeleted}
			>
				{label}
			</span>

			<!-- Sublabel inline -->
			{#if sublabel}
				<span class="truncate text-xs text-muted-foreground">
					{sublabel}
				</span>
			{/if}

			<!-- Count badge (with filter indicator) -->
			{#if count !== null || totalCount !== null}
				<span
					class="rounded px-1.5 py-0.5 text-xs font-medium {isFiltered && count !== totalCount ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}"
				>
					{#if isFiltered && count !== totalCount}
						{count}/{totalCount}
					{:else}
						{totalCount ?? count}
					{/if}
				</span>
			{/if}
		</div>
	</div>
</button>
