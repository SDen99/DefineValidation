<!-- @sden99/vlm-components VLMStratificationCell.svelte -->
<!-- Displays stratification column values in expanded mode -->
<!-- Values can be discrete (EQ/IN) or condition text (NE/NOTIN/ranges) -->
<script lang="ts">
	import type { DisplayCondition } from '../../../types/index.js';

	let { row, column } = $props<{
		row: any;
		column: string;
	}>();

	// Get the stratification condition metadata if available
	let conditionMeta = $derived.by(() => {
		const stratConds = row.stratificationConditions as Record<string, DisplayCondition> | undefined;
		return stratConds?.[column];
	});

	// Determine if this is a discrete value or a condition expression
	let isDiscreteValue = $derived.by(() => {
		if (!conditionMeta) return true;
		const comp = conditionMeta.comparator;
		return comp === 'EQ' || (comp === 'IN' && conditionMeta.values.length === 1);
	});

	/**
	 * Extract a meaningful display value from stratification variable objects
	 */
	function formatStratificationValue(value: any): string {
		if (value === null || value === undefined) {
			return '';
		}

		// If it's already a simple string/number, return it
		if (typeof value !== 'object') {
			return String(value);
		}

		// Pattern 1: Direct codedValue/decode pattern
		if (value.codedValue !== undefined) {
			return String(value.codedValue);
		}

		// Pattern 2: paramInfo structure (similar to PARAMCD/PARAM)
		if (value.paramInfo) {
			return value.paramInfo.codedValue || value.paramInfo.decode || '';
		}

		// Pattern 3: Direct value property
		if (value.value !== undefined) {
			return String(value.value);
		}

		// Pattern 4: Label or description
		if (value.label) {
			return String(value.label);
		}
		if (value.description) {
			return String(value.description);
		}

		// Pattern 5: Text property
		if (value.text) {
			return String(value.text);
		}

		// Pattern 6: Name property
		if (value.name) {
			return String(value.name);
		}

		// Pattern 7: For comparator-based objects (like whereClause conditions)
		if (value.comparator && value.checkValues) {
			const comparatorSymbol = formatComparator(value.comparator);
			const values = Array.isArray(value.checkValues)
				? value.checkValues.join(', ')
				: String(value.checkValues);
			return `${comparatorSymbol} ${values}`;
		}

		// Pattern 8: If it has a meaningful toString that's not [object Object]
		if (value.toString && typeof value.toString === 'function') {
			const stringified = value.toString();
			if (stringified !== '[object Object]' && stringified !== 'object Object') {
				return stringified;
			}
		}

		// Pattern 9: Try to get the first meaningful string property
		const keys = Object.keys(value);
		for (const key of keys) {
			const prop = value[key];
			if (typeof prop === 'string' && prop.trim()) {
				return prop;
			}
		}

		// Last resort: Use JSON.stringify but make it more readable
		try {
			const json = JSON.stringify(value, null, 1);
			if (json.length < 100) {
				return json.replace(/\s+/g, ' ').replace(/[{}]/g, '');
			}
			return json;
		} catch {
			return String(value);
		}
	}

	/**
	 * Format comparator symbols for display
	 */
	function formatComparator(comparator: string): string {
		switch (comparator) {
			case 'EQ':
				return '=';
			case 'NE':
				return '≠';
			case 'LT':
				return '<';
			case 'LE':
				return '≤';
			case 'GT':
				return '>';
			case 'GE':
				return '≥';
			case 'IN':
				return 'in';
			case 'NOTIN':
				return 'not in';
			default:
				return comparator;
		}
	}
</script>

<div class="text-sm" class:text-foreground={isDiscreteValue} class:text-muted-foreground={!isDiscreteValue} class:italic={!isDiscreteValue}>
	{formatStratificationValue(row[column])}
	{#if conditionMeta && !isDiscreteValue}
		<span class="text-xs ml-1" title="Condition-based value">(condition)</span>
	{/if}
</div>
