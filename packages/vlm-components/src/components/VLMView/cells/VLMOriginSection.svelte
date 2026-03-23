<!-- packages/app/src/lib/components/VLMView/cells/VLMOriginSection.svelte -->
<!-- Enhanced to use centralized expansion state -->
<script lang="ts">
	import VLMExpandableSection from './VLMExpandableSection.svelte';

	let { origin, sectionId, expanded, onToggle } = $props<{
		origin: {
			type?: string;
			source?: string;
			description?: string;
			translatedText?: string;
		};
		sectionId: string;
		expanded: boolean; // NEW: expansion state from parent
		onToggle: () => void; // NEW: toggle callback to parent
	}>();
</script>

<VLMExpandableSection title="Origin" {sectionId} {expanded} {onToggle}>
	{#if origin.type}
		<div class="mb-1">
			<span class="text-muted-foreground mr-1 text-xs font-medium">Type:</span>
			{origin.type}
		</div>
	{/if}

	{#if origin.source}
		<div class="mb-1">
			<span class="text-muted-foreground mr-1 text-xs font-medium">Source:</span>
			{origin.source}
		</div>
	{/if}

	{#if origin.description}
		<div class="mb-1">
			<span class="text-muted-foreground mr-1 text-xs font-medium">Description:</span>
			{origin.description}
		</div>
	{/if}

	{#if origin.translatedText}
		<div class="mb-1">
			<span class="text-muted-foreground mr-1 text-xs font-medium">TranslatedText:</span>
			{origin.translatedText}
		</div>
	{/if}
</VLMExpandableSection>
