<!-- packages/app/src/lib/components/VLMView/cells/VLMMethodSection.svelte -->
<!-- Enhanced to use centralized expansion state -->
<script lang="ts">
	import VLMExpandableSection from './VLMExpandableSection.svelte';
	import type { VLMMethod } from '@sden99/cdisc-types';

	let { method, sectionId, expanded, onToggle } = $props<{
		method: VLMMethod;
		sectionId: string;
		expanded: boolean;
		onToggle: () => void;
	}>();
</script>

<VLMExpandableSection title="Method" {sectionId} {expanded} {onToggle}>
	{#if method.Name}
		<div class="mb-1">
			<span class="text-muted-foreground mr-1 text-xs font-medium">Name:</span>
			{method.Name}
		</div>
	{/if}
	{#if method.Type}
		<div class="mb-1">
			<span class="text-muted-foreground mr-1 text-xs font-medium">Type:</span>
			{method.Type}
		</div>
	{/if}
	{#if method.Description}
		<div class="mb-1">
			<span class="text-muted-foreground mr-1 text-xs font-medium">Description:</span>
			{method.Description}
		</div>
	{/if}
</VLMExpandableSection>
