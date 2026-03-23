<!-- packages/app/src/lib/components/VLMView/cells/VLMExpandableSection.svelte -->
<!-- Enhanced "dumb" component that receives expansion state as props -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children, title, sectionId, expanded, onToggle } = $props<{
		children: Snippet;
		title: string;
		sectionId: string;
		expanded: boolean;
		onToggle: () => void;
	}>();

	function handleToggle() {
		onToggle();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleToggle();
		}
	}
</script>

<div class="mb-2">
	<button
		type="button"
		class="bg-primary/20 text-foreground hover:bg-primary/30 mb-1 flex w-fit cursor-pointer items-center gap-1 rounded-sm px-2 py-1 transition-colors"
		onclick={handleToggle}
		onkeydown={handleKeyDown}
		aria-expanded={expanded}
		aria-controls={sectionId}
	>
		<svg
			class="text-foreground h-3 w-3 transition-transform duration-200"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d={expanded ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'}></path>
		</svg>
		<span class="text-foreground text-xs font-medium">{title}</span>
	</button>
	<div
		class={expanded ? 'text-foreground bg-card/50 border-border rounded border-l-2 pl-2' : 'hidden'}
		id={sectionId}
	>
		{@render children()}
	</div>
</div>
