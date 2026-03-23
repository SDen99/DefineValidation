<script lang="ts">
	import type { DataRow } from '../types/core';
	import type { ColumnConfig } from '../types/columns';

	interface Props {
		value: unknown;
		column: ColumnConfig;
		row: DataRow;
		rowIndex: number;
	}

	let { value, column, row, rowIndex }: Props = $props();

	// Format value based on column type
	const formattedValue = $derived.by(() => {
		if (value === null || value === undefined) {
			return '';
		}

		// Use custom formatter if provided
		if (column.formatter) {
			return column.formatter(value);
		}

		// Default formatting based on data type
		switch (column.dataType) {
			case 'number':
				return typeof value === 'number' ? value.toLocaleString() : String(value);
			case 'date':
				return value instanceof Date ? value.toLocaleDateString() : String(value);
			case 'boolean':
				return value ? '✓' : '';
			default:
				return String(value);
		}
	});
</script>

<td
	class="cell px-3 py-2 border-b overflow-hidden text-ellipsis whitespace-nowrap text-sm"
	title={String(value)}
>
	{formattedValue}
</td>

<style>
	td.cell {
		max-width: 300px;
		color: hsl(var(--color-foreground));
		border-color: hsl(var(--color-border));
	}
</style>
