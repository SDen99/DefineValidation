<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
	<div class="text-center">
		<h1 class="mb-4 text-4xl font-bold">Metadata Browser Prototype</h1>
		<p class="mb-8 text-lg text-muted-foreground">
			Route-based navigation prototype for Define-XML metadata exploration
		</p>
	</div>

	<div class="flex gap-4">
		<button
			class="rounded-lg bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
			onclick={() => goto('/dev/metadata-browser-prototype/adam')}
		>
			Explore ADaM Define-XML
		</button>

		<button
			class="rounded-lg bg-secondary px-8 py-4 text-lg font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90"
			onclick={() => goto('/dev/metadata-browser-prototype/sdtm')}
		>
			Explore SDTM Define-XML
		</button>
	</div>

	<div class="mt-8 max-w-2xl rounded-lg border bg-card p-6 text-card-foreground">
		<h2 class="mb-4 text-xl font-semibold">How to Use</h2>
		<div class="space-y-4 text-sm">
			<div>
				<h3 class="mb-2 font-semibold text-primary">Option 1: Use Real Data (Recommended)</h3>
				<ol class="ml-4 list-decimal space-y-1 text-muted-foreground">
					<li>First, load a Define-XML file in the main app (go to home and upload)</li>
					<li>Return to this page and click the button below</li>
					<li>Prototype will automatically use your loaded Define-XML</li>
					<li>Look for "Using Real Data" badge in the header</li>
				</ol>
			</div>

			<div>
				<h3 class="mb-2 font-semibold text-secondary">Option 2: Use Mock Data</h3>
				<p class="text-muted-foreground">
					If you don't have a Define-XML loaded, the prototype will use sample data (limited to 3
					datasets, 10 variables, 4 codelists)
				</p>
			</div>
		</div>
	</div>

	<div class="mt-4 max-w-2xl rounded-lg border bg-card p-6 text-card-foreground">
		<h2 class="mb-4 text-xl font-semibold">Features to Test</h2>
		<ul class="space-y-2 text-sm">
			<li>✅ Hierarchical tree navigation (Study → MetaDataVersion → Sections)</li>
			<li>✅ Route-based navigation (URLs change, back/forward buttons work)</li>
			<li>✅ Collapsible sections (click to expand/collapse)</li>
			<li>✅ Item selection with detail view</li>
			<li>✅ Connection filtering (show only related metadata)</li>
			<li>✅ Multiple Define-XMLs (ADaM + SDTM)</li>
		</ul>
	</div>

	<p class="text-sm text-muted-foreground">
		<a href="/" class="underline hover:text-foreground">← Back to main app</a>
	</p>
</div>
