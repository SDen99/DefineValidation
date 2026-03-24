<script lang="ts">
	import { page } from '$app/stores';
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';
	
	import { goto } from '$app/navigation';

	// Extract Define-XML data
	const defineBundle = $derived(extractDefineDataForMetadata());

	// Determine define type and get active defineData
	const defineType = $derived<'adam' | 'sdtm'>((defineBundle.adamData ? 'adam' : 'sdtm'));
	const activeDefineData = $derived(
		defineType === 'adam'
			? defineBundle.adamData?.defineData
			: defineBundle.sdtmData?.defineData
	);

	// Navigation helpers
	function navigateToVariable(oid: string) {
		goto(`/metadata/variables/${oid}`);
	}

	function navigateToDataset(oid: string) {
		goto(`/metadata/datasets/${oid}`);
	}

	// Find the comment
	const comment = $derived(
		activeDefineData.Comments?.find((c) => c.OID === $page.params.oid)
	);

	// Find items that reference this comment
	const usedByItems = $derived.by(() => {
		const items: Array<{
			type: 'variable' | 'dataset';
			item: any;
			displayName: string;
			sublabel: string;
		}> = [];

		// Check ItemDefs (variables) that reference this comment
		activeDefineData.ItemDefs?.forEach((itemDef) => {
			if (itemDef.CommentOID === $page.params.oid) {
				// Find which datasets use this variable
				const datasetsUsingVariable = activeDefineData.ItemGroups?.filter((ig) =>
					ig.ItemRefs?.some((ref) => ref.OID === itemDef.OID)
				) || [];

				// Add one entry per dataset
				datasetsUsingVariable.forEach((dataset) => {
					items.push({
						type: 'variable',
						item: itemDef,
						displayName: `${itemDef.Name || itemDef.OID} in ${dataset.Name || dataset.OID}`,
						sublabel: `Variable (${itemDef.DataType})`
					});
				});
			}
		});

		// Check ItemGroups (datasets) that reference this comment
		activeDefineData.ItemGroups?.forEach((itemGroup) => {
			if (itemGroup.CommentOID === $page.params.oid) {
				items.push({
					type: 'dataset',
					item: itemGroup,
					displayName: itemGroup.Name || itemGroup.OID || 'Unknown',
					sublabel: `Dataset (${itemGroup.ItemRefs?.length || 0} variables)`
				});
			}
		});

		return items;
	});
</script>

{#if comment}
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
				<span>Comment</span>
				<span>›</span>
				<span>{comment.OID}</span>
			</div>
			<h1 class="mb-2 text-3xl font-bold">{comment.OID}</h1>
		</div>

		<!-- Comment Text -->
		<div class="mb-6 rounded-lg border bg-card p-4">
			<h2 class="mb-2 text-lg font-semibold">Comment Text</h2>
			<p class="text-sm whitespace-pre-wrap">{comment.Description || 'No comment text available'}</p>
		</div>

		<!-- Used By (Items) -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">Used By ({usedByItems.length} references)</h2>
			</div>
			<div class="p-4">
				{#if usedByItems.length > 0}
					<div class="space-y-1">
						{#each usedByItems as { type, item, displayName, sublabel }}
							<button
								onclick={() => item.OID && (type === 'variable' ? navigateToVariable(item.OID) : navigateToDataset(item.OID))}
								class="w-full rounded border p-2 text-left transition-colors hover:bg-muted"
							>
								<div class="flex items-center justify-between gap-4">
									<div class="flex-1">
										<div class="text-sm font-medium">{displayName}</div>
									</div>
									<div class="flex-shrink-0">
										<span class="text-xs text-muted-foreground">
											{sublabel}
										</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">
						This comment is not currently referenced by any items.
					</p>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="mb-4 text-2xl font-bold">Comment Not Found</h1>
		<p class="text-muted-foreground">
			The comment with OID "{$page.params.oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
