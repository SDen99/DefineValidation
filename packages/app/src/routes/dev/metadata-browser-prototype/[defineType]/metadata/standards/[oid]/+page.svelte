<script lang="ts">
	import { page } from '$app/stores';
	import { getContext } from 'svelte';

	// Get reactive data from parent layout
	const getDefineData = getContext<() => any>('defineData');
	const activeData = $derived(getDefineData?.() ?? { defineData: null });

	// Find the standard
	const standard = $derived(
		activeData.defineData.Standards?.find((std) => std.OID === $page.params.oid)
	);

	// Find associated comment
	const comment = $derived(
		standard?.CommentOID
			? activeData.defineData.Comments?.find((c) => c.OID === standard.CommentOID)
			: null
	);
</script>

{#if standard}
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
				<span>Standard</span>
				<span>›</span>
				<span>{standard.OID}</span>
			</div>
			<h1 class="mb-2 text-3xl font-bold">{standard.Name || standard.OID}</h1>
			<div class="flex gap-4 text-sm text-muted-foreground">
				{#if standard.Version}
					<span>Version: {standard.Version}</span>
				{/if}
				{#if standard.Status}
					<span>Status: {standard.Status}</span>
				{/if}
			</div>
		</div>

		<!-- Standard Properties -->
		<div class="mb-6 rounded-lg border bg-card p-6">
			<h2 class="mb-4 text-lg font-semibold">Properties</h2>
			<dl class="grid gap-4 sm:grid-cols-2">
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Name</dt>
					<dd class="mt-1 text-sm">{standard.Name || 'N/A'}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Type</dt>
					<dd class="mt-1 text-sm">{standard.Type || 'N/A'}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Version</dt>
					<dd class="mt-1 text-sm">{standard.Version || 'N/A'}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Status</dt>
					<dd class="mt-1 text-sm">{standard.Status || 'N/A'}</dd>
				</div>
				{#if standard.PublishingSet}
					<div class="sm:col-span-2">
						<dt class="text-sm font-medium text-muted-foreground">Publishing Set</dt>
						<dd class="mt-1 text-sm">{standard.PublishingSet}</dd>
					</div>
				{/if}
			</dl>
		</div>

		<!-- Comment -->
		{#if comment}
			<div class="rounded-lg border bg-card p-4">
				<h2 class="mb-2 text-lg font-semibold">Comment</h2>
				<p class="whitespace-pre-wrap text-sm">{comment.Description}</p>
			</div>
		{/if}
	</div>
{:else}
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="mb-4 text-2xl font-bold">Standard Not Found</h1>
		<p class="text-muted-foreground">
			The standard with OID "{$page.params.oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
