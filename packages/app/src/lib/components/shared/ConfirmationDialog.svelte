<script lang="ts">
	const props = $props<{
		open: boolean;
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'destructive' | 'default';
		onConfirm: () => void;
		onCancel: () => void;
	}>();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			props.onCancel();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			props.onCancel();
		}
	}
</script>

{#if props.open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="dialog-title"
		aria-describedby="dialog-description"
		tabindex="-1"
	>
		<div class="bg-background mx-4 w-full max-w-md rounded-lg border p-6 shadow-lg">
			<div class="flex flex-col space-y-4">
				<h2 id="dialog-title" class="text-lg font-semibold">
					{props.title}
				</h2>

				<p id="dialog-description" class="text-muted-foreground text-sm">
					{props.message}
				</p>

				<div
					class="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:justify-end sm:space-y-0 sm:space-x-2"
				>
					<button
						type="button"
						class="border-border bg-background hover:bg-accent hover:text-accent-foreground focus:ring-ring inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none"
						onclick={props.onCancel}
					>
						{props.cancelText || 'Cancel'}
					</button>
					<button
						type="button"
						class={props.variant === 'destructive'
							? 'inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none'
							: 'inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'}
						onclick={props.onConfirm}
					>
						{props.confirmText || 'Confirm'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
