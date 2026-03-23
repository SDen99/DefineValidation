<!-- packages/app/src/lib/components/VLMView/cells/VLMDebugSection.svelte -->
<!-- Enhanced to use centralized expansion state -->
<script lang="ts">
	let { data, sectionId, expanded, onToggle } = $props<{
		data: {
			variable?: {
				oid?: string;
			};
			whereClauseOID?: string;
			methodOID?: string;
			commentOID?: string;
		};
		sectionId: string;
		expanded: boolean; // NEW: expansion state from parent
		onToggle: () => void; // NEW: toggle callback to parent
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

<div class="text-foreground mt-2 text-xs">
	<button
		type="button"
		class="text-muted-foreground hover:text-foreground cursor-pointer text-left underline"
		onclick={handleToggle}
		onkeydown={handleKeyDown}
		aria-expanded={expanded}
		aria-controls={sectionId}
	>
		Debug OIDs
	</button>
	<div class={expanded ? 'mt-1 pl-2' : 'hidden'} id={sectionId}>
		{#if data.variable?.oid}
			<div class="mb-1">ItemDef OID: {data.variable.oid}</div>
		{/if}
		{#if data.whereClauseOID}
			<div class="mb-1">WhereClause OID: {data.whereClauseOID}</div>
		{/if}
		{#if data.methodOID}
			<div class="mb-1">Method OID: {data.methodOID}</div>
		{/if}
		{#if data.commentOID}
			<div class="mb-1">Comment OID: {data.commentOID}</div>
		{/if}
	</div>
</div>
