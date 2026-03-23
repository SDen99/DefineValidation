<script lang="ts" module>
	export interface ToastProps {
		position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
	}
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import * as errorState from '$lib/core/state/errorState.svelte.ts';
	import { Button } from '@sden99/ui-components';

	function getColorClass(severity: string): string {
		switch (severity) {
			case 'critical':
			case 'error':
				return 'border-destructive bg-destructive/10 text-destructive';
			case 'warning':
				return 'border-warning bg-warning/10 text-warning';
			case 'info':
				return 'border-info bg-info/10 text-info';
			default:
				return 'border-border';
		}
	}

	function getSeverityIcon(severity: string): string {
		switch (severity) {
			case 'critical':
			case 'error':
				return `<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12" y2="16" />
        </svg>`;
			case 'warning':
				return `<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12" y2="17" />
        </svg>`;
			case 'info':
				return `<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="8" />
        </svg>`;
			default:
				return '';
		}
	}
</script>

<div class="fixed right-4 bottom-4 z-50 flex max-w-md flex-col gap-2">
	{#each errorState.errors as error (error.id)}
		<div
			transition:fly={{ y: 50, duration: 200 }}
			class="relative rounded-lg border p-4 {getColorClass(error.severity)}"
			role="alert"
		>
			<div class="flex gap-3">
				{@html getSeverityIcon(error.severity)}
				<div class="flex-1">
					<div class="mb-1 leading-none font-medium">
						{error.severity.charAt(0).toUpperCase() + error.severity.slice(1)}
					</div>
					<div class="mt-1 text-sm">{error.message}</div>
				</div>
				<button
					class="ring-offset-background absolute top-2 right-2 opacity-70 transition-opacity hover:opacity-100"
					onclick={() => errorState.dismissError(error.id)}
					aria-label="Close"
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
		</div>
	{/each}
</div>
