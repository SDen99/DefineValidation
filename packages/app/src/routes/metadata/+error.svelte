<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '@sden99/ui-components';
	import { AlertCircle, Home } from '@lucide/svelte/icons';

	// Log the error for debugging
	$effect(() => {
		if ($page.error) {
			console.error('[Metadata Error Boundary]', {
				message: $page.error.message,
				status: $page.status,
				url: $page.url.pathname
			});
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-8">
	<div class="w-full max-w-md">
		<div class="rounded-lg border border-border bg-card p-8 shadow-lg">
			<div class="mb-6 flex items-center justify-center">
				<div
					class="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive"
				>
					<AlertCircle class="h-8 w-8" />
				</div>
			</div>

			<h1 class="mb-2 text-center text-2xl font-bold text-foreground">
				{$page.status === 404 ? 'Page Not Found' : 'Something Went Wrong'}
			</h1>

			<p class="mb-6 text-center text-muted-foreground">
				{#if $page.status === 404}
					The metadata page you're looking for doesn't exist or may have been removed.
				{:else if $page.error?.message}
					{$page.error.message}
				{:else}
					An unexpected error occurred while loading the metadata. This might happen if the
					Define-XML data was removed or is no longer available.
				{/if}
			</p>

			<div class="space-y-3">
				<Button href="/" class="w-full" variant="default">
					<Home class="mr-2 h-4 w-4" />
					Return to Dataset View
				</Button>

				<Button
					onclick={() => window.history.back()}
					class="w-full"
					variant="outline"
				>
					Go Back
				</Button>
			</div>

			{#if $page.status}
				<div class="mt-6 rounded-md bg-muted p-3 text-center">
					<p class="text-sm text-muted-foreground">
						Error {$page.status}
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
