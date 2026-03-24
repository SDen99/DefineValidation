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

	// Find the variable
	const variable = $derived(
		activeDefineData.ItemDefs?.find((item) => item.OID === $page.params.oid)
	);

	// Navigation helpers
	function navigateToCodeList(oid: string) {
		goto(`/metadata/codelists/${oid}`);
	}

	function navigateToDataset(oid: string) {
		goto(`/metadata/datasets/${oid}`);
	}

	// Generate deduplication signature for ItemDef (same as in tree)
	function getItemDefSignature(itemDef: any): string {
		const normalize = (val: any) => {
			if (val === null || val === undefined || val === '') return 'NULL';
			return String(val);
		};

		return [
			normalize(itemDef.Name),
			normalize(itemDef.DataType),
			normalize(itemDef.Length),
			normalize(itemDef.Label),
			normalize(itemDef.CommentOID),
			normalize(itemDef.CodeListOID),
			normalize(itemDef.Origin?.Type),
			normalize(itemDef.Origin?.Source)
		].join('|');
	}

	// Find all OID variants of this variable (same signature)
	const oidVariants = $derived.by(() => {
		if (!variable) return [];

		const signature = getItemDefSignature(variable);

		return activeDefineData.ItemDefs?.filter((item: any) =>
			getItemDefSignature(item) === signature
		).map((item: any) => item.OID).filter(Boolean).sort() || [];
	});

	// Find datasets that use ANY variant of this variable
	const usedByDatasets = $derived.by(() => {
		if (oidVariants.length === 0) return [];

		const datasets = activeDefineData.ItemGroups?.filter((ig) => {
			return ig.ItemRefs?.some((ref) => oidVariants.includes(ref.OID));
		}) || [];

		// Sort alphabetically by Name
		return datasets.sort((a, b) =>
			(a.Name || a.OID || '').localeCompare(b.Name || b.OID || '')
		);
	});

	// Find referenced metadata
	const referencedCodeList = $derived.by(() => {
		if (!variable?.CodeListOID) return null;
		const codelist = activeDefineData.CodeLists?.find((cl) => cl.OID === variable.CodeListOID);
		if (!codelist?.OID) return null;

		return codelist;
	});

	const referencedValueList = $derived.by(() => {
		if (!variable?.ValueListOID) return null;
		return activeDefineData.ValueListDefs?.find((vl) => vl.OID === variable.ValueListOID);
	});
</script>

{#if variable}
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center justify-between">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<span>Variable</span>
					<span>›</span>
					<span>{variable.OID}</span>
				</div>
			</div>

			<h1 class="mb-2 text-3xl font-bold">{variable.Name || variable.OID}</h1>

			<div class="flex gap-4 text-sm text-muted-foreground">
				<span>Type: {variable.DataType || 'unknown'}</span>
				{#if variable.Length}
					<span>Length: {variable.Length}</span>
				{/if}
				{#if variable.SignificantDigits}
					<span>Significant Digits: {variable.SignificantDigits}</span>
				{/if}
			</div>
		</div>

		<!-- Basic Information -->
		<div class="mb-6 rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">Basic Information</h2>
			</div>
			<div class="p-4">
				<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<!-- Name -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Name</dt>
						<dd class="mt-1">
							<span class="text-sm">{variable.Name || '—'}</span>
						</dd>
					</div>

					<!-- SASFieldName -->
					{#if variable.SASFieldName}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">SAS Field Name</dt>
							<dd class="mt-1">
								<span class="text-sm font-mono">{variable.SASFieldName || '—'}</span>
							</dd>
						</div>
					{/if}

					<!-- DataType -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Data Type</dt>
						<dd class="mt-1">
							<span class="text-sm">{variable.DataType || '—'}</span>
						</dd>
					</div>

					<!-- Length -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Length</dt>
						<dd class="mt-1">
							<span class="text-sm">{variable.Length || '—'}</span>
						</dd>
					</div>

					<!-- SignificantDigits -->
					{#if variable.SignificantDigits}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Significant Digits</dt>
							<dd class="mt-1">
								<span class="text-sm">{variable.SignificantDigits || '—'}</span>
							</dd>
						</div>
					{/if}

					<!-- DisplayFormat -->
					{#if variable.DisplayFormat}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Display Format</dt>
							<dd class="mt-1">
								<span class="text-sm font-mono">{variable.DisplayFormat || '—'}</span>
							</dd>
						</div>
					{/if}

					<!-- Origin -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Origin</dt>
						<dd class="mt-1">
							<span class="text-sm">{variable.Origin || '—'}</span>
						</dd>
					</div>
				</dl>

				<!-- Description (full width) -->
				{#if variable.Description}
					<div class="mt-4">
						<dt class="text-sm font-medium text-muted-foreground">Description</dt>
						<dd class="mt-1">
							<p class="text-sm whitespace-pre-wrap">{variable.Description || '—'}</p>
						</dd>
					</div>
				{/if}
			</div>
		</div>

		<!-- References -->
		<div class="mb-6 rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">References</h2>
			</div>
			<div class="p-4">
				<dl class="space-y-4">
					<!-- CodeList Reference -->
					{#if variable.CodeListOID || referencedCodeList}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">CodeList</dt>
							<dd class="mt-1">
								{#if referencedCodeList}
									<button
										onclick={() => navigateToCodeList(referencedCodeList.OID!)}
										class="inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
									>
										<span class="font-medium">{referencedCodeList.Name || referencedCodeList.OID}</span>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
										</svg>
									</button>
								{:else}
									<span class="text-sm text-muted-foreground">{variable.CodeListOID} (not found)</span>
								{/if}
							</dd>
						</div>
					{/if}

					<!-- ValueList Reference -->
					{#if variable.ValueListOID || referencedValueList}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Value List (VLM)</dt>
							<dd class="mt-1">
								{#if referencedValueList}
									<span class="rounded border px-3 py-1.5 text-sm">
										{referencedValueList.OID}
									</span>
								{:else}
									<span class="text-sm text-muted-foreground">{variable.ValueListOID} (not found)</span>
								{/if}
							</dd>
						</div>
					{/if}

					<!-- No references -->
					{#if !variable.CodeListOID && !variable.ValueListOID}
						<p class="text-sm text-muted-foreground">
							This variable has no references to controlled terminology or value-level metadata.
						</p>
					{/if}
				</dl>
			</div>
		</div>

		<!-- OID Variants -->
		{#if oidVariants.length > 1}
			<div class="rounded-lg border bg-card">
				<div class="border-b p-4">
					<h2 class="text-lg font-semibold">OID Variants ({oidVariants.length})</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						This variable has multiple OIDs with identical basic information
					</p>
				</div>
				<div class="p-4">
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{#each oidVariants as oid}
							{@const isCurrent = oid === variable?.OID}
							<div
								class="rounded border p-2 text-sm font-mono {isCurrent ? 'bg-primary/10 border-primary' : ''}"
							>
								{oid}
								{#if isCurrent}
									<span class="ml-2 text-xs text-primary">(current)</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Used By (Datasets) -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">Used By ({usedByDatasets.length} datasets)</h2>
				{#if oidVariants.length > 1}
					<p class="mt-1 text-sm text-muted-foreground">
						Aggregated across all {oidVariants.length} OID variants
					</p>
				{/if}
			</div>
			<div class="p-4">
				{#if usedByDatasets.length > 0}
					<div class="space-y-1">
						{#each usedByDatasets as dataset}
							<button
								onclick={() => dataset.OID && navigateToDataset(dataset.OID)}
								class="w-full rounded border p-2 text-left transition-colors hover:bg-muted"
							>
								<div class="flex items-center justify-between gap-4">
									<div class="flex-1">
										<div class="text-sm font-medium">{dataset.Name || dataset.OID}</div>
										{#if (dataset as any).Label}
											<div class="text-xs text-muted-foreground">{(dataset as any).Label}</div>
										{/if}
									</div>
									<div class="flex-shrink-0">
										<span class="text-xs text-muted-foreground">
											{(dataset as any).Domain || 'Dataset'}
										</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">
						This variable is not currently used by any datasets.
					</p>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="mb-4 text-2xl font-bold">Variable Not Found</h1>
		<p class="text-muted-foreground">
			The variable with OID "{$page.params.oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
