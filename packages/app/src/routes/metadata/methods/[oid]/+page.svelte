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

	// Navigation helper
	function navigateToVariable(oid: string) {
		goto(`/metadata/variables/${oid}`);
	}

	// Find the method
	const method = $derived(
		activeDefineData?.Methods?.find((m) => m.OID === $page.params.oid)
	);

	// Find variables that use this method
	const usedByVariables = $derived.by(() => {
		if (!activeDefineData) return [];

		const variableOIDs = new Set<string>();

		// Check ItemRefs for methods
		activeDefineData.ItemGroups?.forEach((ig) => {
			ig.ItemRefs?.forEach((ref) => {
				if (ref.MethodOID === $page.params.oid && ref.OID) {
					variableOIDs.add(ref.OID);
				}
			});
		});

		// Get the actual ItemDefs
		const variables = Array.from(variableOIDs)
			.map((oid) => activeDefineData.ItemDefs?.find((item) => item.OID === oid))
			.filter((v) => v != null);

		// For each variable, find which datasets use it
		return variables.flatMap((variable) => {
			const datasetsUsingVariable = activeDefineData.ItemGroups?.filter((ig) =>
				ig.ItemRefs?.some((ref) => ref.OID === variable.OID)
			) || [];

			return datasetsUsingVariable.map((dataset) => ({
				variable,
				dataset,
				displayName: `${variable.Name} in ${dataset.Name || dataset.OID}`
			}));
		});
	});
</script>

{#if method}
	<div class="mx-auto max-w-4xl p-6">
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
				<span>Method</span>
				<span>›</span>
				<span>{method.OID}</span>
			</div>
			<div class="flex items-center justify-between">
				<div class="flex-1">
					<h1 class="mb-2 text-3xl font-bold">{method.Name || method.OID || ''}</h1>
					<div class="text-sm text-muted-foreground">
						<span>Type: {method.Type || '—'}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Description -->
		<div class="mb-6 rounded-lg border bg-card p-4">
			<h2 class="mb-2 text-lg font-semibold">Description</h2>
			<p class="text-sm whitespace-pre-wrap">{method.Description || '—'}</p>
		</div>

		<!-- Additional Fields (Document, Pages, TranslatedText) -->
		{#if method.Document || method.Pages || method.TranslatedText}
			<div class="mb-6 rounded-lg border bg-card p-4">
				<h2 class="mb-4 text-lg font-semibold">Additional Information</h2>
				<div class="space-y-4">
					<!-- Document -->
					<div>
						<label class="mb-1 block text-sm font-medium">Document Reference</label>
						<span class="text-sm">{method.Document || '—'}</span>
					</div>

					<!-- Pages -->
					<div>
						<label class="mb-1 block text-sm font-medium">Pages</label>
						<span class="text-sm">{method.Pages || '—'}</span>
					</div>

					<!-- TranslatedText -->
					<div>
						<label class="mb-1 block text-sm font-medium">Translated Text</label>
						<p class="text-sm whitespace-pre-wrap">{method.TranslatedText || '—'}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Used By (Variables) -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">Used By ({usedByVariables.length} occurrences)</h2>
			</div>
			<div class="p-4">
				{#if usedByVariables.length > 0}
					<div class="space-y-1">
						{#each usedByVariables as { variable, dataset, displayName }}
							<button
								onclick={() => variable.OID && navigateToVariable(variable.OID)}
								class="w-full rounded border p-2 text-left transition-colors hover:bg-muted"
							>
								<div class="flex items-center justify-between gap-4">
									<div class="flex-1">
										<div class="text-sm font-medium">{displayName}</div>
									</div>
									<div class="flex-shrink-0">
										<span class="text-xs text-muted-foreground">
											{variable.DataType}
										</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">
						This method is not currently used by any variables.
					</p>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="mx-auto max-w-2xl p-8 text-center">
		<h1 class="mb-4 text-2xl font-bold">Method Not Found</h1>
		<p class="text-muted-foreground">
			The method with OID "{$page.params.oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
