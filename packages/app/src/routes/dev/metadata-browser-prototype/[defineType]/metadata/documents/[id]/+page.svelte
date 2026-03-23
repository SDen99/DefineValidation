<script lang="ts">
	import { page } from '$app/stores';
	import { getContext } from 'svelte';

	// Get reactive data from parent layout
	const getDefineData = getContext<() => any>('defineData');
	const activeData = $derived(getDefineData?.() ?? { defineData: null });

	// Find the document
	const document = $derived(
		activeData.defineData.Documents?.find((doc) => doc.ID === $page.params.id)
	);
</script>

{#if document}
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
				<span>Document</span>
				<span>›</span>
				<span>{document.ID}</span>
			</div>
			<h1 class="mb-2 text-3xl font-bold">{document.Title || document.ID}</h1>
		</div>

		<!-- Document Properties -->
		<div class="mb-6 rounded-lg border bg-card p-6">
			<h2 class="mb-4 text-lg font-semibold">Properties</h2>
			<dl class="grid gap-4">
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Document ID</dt>
					<dd class="mt-1 text-sm">{document.ID}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Title</dt>
					<dd class="mt-1 text-sm">{document.Title || 'N/A'}</dd>
				</div>
				{#if document.Href}
					<div>
						<dt class="text-sm font-medium text-muted-foreground">File Reference</dt>
						<dd class="mt-1">
							<a
								href={document.Href}
								target="_blank"
								rel="noopener noreferrer"
								class="text-sm text-primary hover:underline"
							>
								{document.Href}
							</a>
						</dd>
					</div>
				{/if}
			</dl>
		</div>

		<!-- Additional Info -->
		<div class="rounded-lg border bg-card p-4">
			<h2 class="mb-2 text-lg font-semibold">Additional Information</h2>
			<p class="text-sm text-muted-foreground">
				This document is referenced by various elements in the Define-XML metadata. Use the
				relationship graph or search to find elements that reference this document.
			</p>
		</div>
	</div>
{:else}
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="mb-4 text-2xl font-bold">Document Not Found</h1>
		<p class="text-muted-foreground">
			The document with ID "{$page.params.id}" was not found in this Define-XML.
		</p>
	</div>
{/if}
