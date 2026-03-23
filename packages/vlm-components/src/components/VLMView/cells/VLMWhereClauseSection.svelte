<!-- packages/app/src/lib/components/VLMView/cells/VLMWhereClauseSection.svelte -->
<!-- Enhanced to use centralized expansion state -->
<script lang="ts">
	import VLMExpandableSection from './VLMExpandableSection.svelte';
	import type { ValueLevelMetadata } from '@sden99/data-processing';

	let { whereClause, sectionId, expanded, onToggle } = $props<{
		whereClause: ValueLevelMetadata['whereClause'];
		sectionId: string;
		expanded: boolean; // NEW: expansion state from parent
		onToggle: () => void; // NEW: toggle callback to parent
	}>();

	// Helper function to format comparators
	function formatComparator(comparator: string): string {
		switch (comparator) {
			case 'EQ':
				return '=';
			case 'NE':
				return '≠';
			case 'LT':
				return '<';
			case 'LE':
				return '≤';
			case 'GT':
				return '>';
			case 'GE':
				return '≥';
			case 'IN':
				return 'in';
			case 'NOTIN':
				return 'not in';
			default:
				return comparator;
		}
	}
</script>

<VLMExpandableSection title="Where Clause" {sectionId} {expanded} {onToggle}>
	{#if whereClause?.conditions}
		{#each whereClause.conditions as condition}
			<div class="mb-1 text-sm">
				<span class="text-muted-foreground mr-1 font-medium">Condition:</span>
				<span class="font-mono">{condition.variable}</span>
				<span class="mx-1 font-mono">{formatComparator(condition.comparator)}</span>
				<span class="font-mono">[{condition.checkValues.join(', ')}]</span>
			</div>
		{/each}
	{/if}
</VLMExpandableSection>
