<script lang="ts">
	/**
	 * FieldChangeDisplay - Shows old vs new value comparison for a field change
	 */
	let {
		fieldName,
		oldValue,
		newValue
	}: {
		fieldName: string;
		oldValue: any;
		newValue: any;
	} = $props();

	// Format value for display (handle null/undefined, arrays, objects)
	function formatValue(value: any): string {
		if (value === null || value === undefined) {
			return '(empty)';
		}
		if (typeof value === 'object') {
			return JSON.stringify(value, null, 2);
		}
		return String(value);
	}

	const formattedOld = $derived(formatValue(oldValue));
	const formattedNew = $derived(formatValue(newValue));
</script>

<div class="space-y-1 rounded border border-border bg-muted/30 p-2 text-xs">
	<div class="font-medium text-foreground">{fieldName}</div>
	<div class="grid grid-cols-2 gap-2">
		<!-- Old Value -->
		<div class="space-y-0.5">
			<div class="text-muted-foreground">Before:</div>
			<div class="rounded bg-destructive/10 px-2 py-1 font-mono text-destructive">
				{formattedOld}
			</div>
		</div>
		<!-- New Value -->
		<div class="space-y-0.5">
			<div class="text-muted-foreground">After:</div>
			<div class="rounded bg-primary/10 px-2 py-1 font-mono text-primary">
				{formattedNew}
			</div>
		</div>
	</div>
</div>
