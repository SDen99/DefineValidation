<!-- packages/app/src/lib/components/VLMView/cells/VLMCommentSection.svelte -->
<!-- Enhanced to use centralized expansion state -->
<script lang="ts">
	import VLMExpandableSection from './VLMExpandableSection.svelte';

	let { comment, sectionId, expanded, onToggle } = $props<{
		comment: {
			description: string;
			OID?: string;
		};
		sectionId: string;
		expanded: boolean; // NEW: expansion state from parent
		onToggle: () => void; // NEW: toggle callback to parent
	}>();
</script>

<VLMExpandableSection title="Comment" {sectionId} {expanded} {onToggle}>
	<div class="text-sm leading-relaxed">
		{comment.description}
	</div>
</VLMExpandableSection>
