<!-- packages/app/src/lib/components/VLMView/cells/VLMCodelistSection.svelte -->
<!-- Enhanced to use centralized expansion state -->
<script lang="ts">
	import VLMExpandableSection from './VLMExpandableSection.svelte';

	let { codelist, sectionId, expanded, onToggle } = $props<{
		codelist: {
			name?: string;
			comment?: {
				text: string;
			};
			items?: Array<{
				codedValue: string;
				decode: string;
			}>;
		};
		sectionId: string;
		expanded: boolean; // NEW: expansion state from parent
		onToggle: () => void; // NEW: toggle callback to parent
	}>();

	// Create a title with item count if available
	const title = codelist.items ? `Codelist (${codelist.items.length} values)` : 'Codelist';
</script>

<VLMExpandableSection {title} {sectionId} {expanded} {onToggle}>
	{#if codelist.name}
		<div class="mb-2">
			<span class="text-muted-foreground text-xs font-medium">Name:</span>
			<span class="ml-1">{codelist.name}</span>
		</div>
	{/if}

	{#if codelist.comment}
		<div class="bg-muted/10 mb-2 p-2 text-sm">
			<span class="text-muted-foreground block text-xs font-medium">Comment:</span>
			<span class="text-sm">{codelist.comment.text}</span>
		</div>
	{/if}

	{#if codelist.items && codelist.items.length > 0}
		<div class="mt-2">
			<span class="text-muted-foreground mb-1 block text-xs font-medium">Values:</span>
			<div class="max-h-60 overflow-y-auto rounded border">
				<table class="w-full text-sm">
					<thead class="bg-muted/20 text-foreground text-xs">
						<tr>
							<th class="border-b px-2 py-1 text-left">Value</th>
							<th class="border-b px-2 py-1 text-left">Decode</th>
						</tr>
					</thead>
					<tbody>
						{#each codelist.items as item, i}
							<tr class={i % 2 === 0 ? 'bg-background' : 'bg-muted/5'}>
								<td class="border-b px-2 py-1 font-mono">
									{item.codedValue}
								</td>
								<td class="border-b px-2 py-1">
									{item.decode}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</VLMExpandableSection>
