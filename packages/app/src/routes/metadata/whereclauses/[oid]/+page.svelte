<script lang="ts">
	import { page } from '$app/stores';
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';
	import { type DefineType } from '$lib/core/state/metadata/editState.svelte';
	import { goto } from '$app/navigation';

	// Extract Define-XML data
	const defineBundle = $derived(extractDefineDataForMetadata());

	// Determine define type and get active defineData
	const defineType = $derived<DefineType>((defineBundle.adamData ? 'adam' : 'sdtm'));
	const activeDefineData = $derived(
		defineType === 'adam'
			? defineBundle.adamData?.defineData
			: defineBundle.sdtmData?.defineData
	);

	// Navigation helper
	function navigateToVariable(oid: string) {
		goto(`/metadata/variables/${oid}`);
	}

	// Find the whereclause
	const whereclause = $derived(
		activeDefineData.WhereClauseDefs?.find((wc) => wc.OID === $page.params.oid)
	);

	// Find associated comment
	const comment = $derived(
		whereclause?.CommentOID
			? activeDefineData.Comments?.find((c) => c.OID === whereclause.CommentOID)
			: null
	);

	// Find variables that reference this whereclause
	const usedByVariables = $derived.by(() => {
		const variables: any[] = [];

		// Check ValueListDefs for ItemRefs that reference this WhereClause
		activeDefineData.ValueListDefs?.forEach((vl) => {
			vl.ItemRefs?.forEach((ref) => {
				if (ref.WhereClauseOID === $page.params.oid) {
					const itemDef = activeDefineData.ItemDefs?.find((item) => item.OID === ref.OID);
					if (itemDef) {
						variables.push({
							itemDef,
							valueList: vl,
							displayName: `${itemDef.Name || itemDef.OID} (in ${vl.OID})`
						});
					}
				}
			});
		});

		return variables;
	});

	// Helper to get ItemDef name from OID
	function getItemDefName(oid: string): string {
		const itemDef = activeDefineData.ItemDefs?.find((item) => item.OID === oid);
		return itemDef?.Name || oid;
	}
</script>

{#if whereclause}
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
				<span>WhereClause</span>
				<span>›</span>
				<span>{whereclause.OID}</span>
			</div>
			<h1 class="mb-2 text-3xl font-bold">{whereclause.OID}</h1>
		</div>

		<!-- RangeChecks -->
		<div class="mb-6 rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">
					Range Checks ({whereclause.RangeChecks?.length || 0})
				</h2>
			</div>
			<div class="p-4">
				{#if whereclause.RangeChecks && whereclause.RangeChecks.length > 0}
					<div class="space-y-3">
						{#each whereclause.RangeChecks as check}
							<div class="rounded-md border p-4">
								<div class="mb-3 flex items-center justify-between">
									<div class="font-medium">
										Variable: {getItemDefName(check.ItemOID)}
									</div>
									<div class="flex gap-2">
										<span class="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
											{check.Comparator}
										</span>
										<span class="rounded bg-secondary/10 px-2 py-1 text-xs font-medium">
											{check.SoftHard}
										</span>
									</div>
								</div>
								<div class="text-sm text-muted-foreground">
									<div class="mb-1">
										<span class="font-medium">Item OID:</span>
										{check.ItemOID}
									</div>
									{#if check.CheckValues && check.CheckValues.length > 0}
										<div>
											<span class="font-medium">Check Values:</span>
											<span class="ml-2 font-mono">{check.CheckValues.join(', ')}</span>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">No range checks defined.</p>
				{/if}
			</div>
		</div>

		<!-- Comment -->
		{#if comment}
			<div class="mb-6 rounded-lg border bg-card p-4">
				<h2 class="mb-2 text-lg font-semibold">Comment</h2>
				<p class="whitespace-pre-wrap text-sm">{comment.Description}</p>
			</div>
		{/if}

		<!-- Used By (Variables) -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">Used By ({usedByVariables.length} variables)</h2>
			</div>
			<div class="p-4">
				{#if usedByVariables.length > 0}
					<div class="space-y-1">
						{#each usedByVariables as { itemDef, valueList, displayName }}
							<button
								onclick={() => itemDef.OID && navigateToVariable(itemDef.OID)}
								class="w-full rounded border p-2 text-left transition-colors hover:bg-muted"
							>
								<div class="flex items-center justify-between gap-4">
									<div class="flex-1">
										<div class="text-sm font-medium">{displayName}</div>
									</div>
									<div class="flex-shrink-0">
										<span class="text-xs text-muted-foreground">
											{itemDef.DataType}
										</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">
						This whereclause is not currently used by any variables.
					</p>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="mb-4 text-2xl font-bold">WhereClause Not Found</h1>
		<p class="text-muted-foreground">
			The whereclause with OID "{$page.params.oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
