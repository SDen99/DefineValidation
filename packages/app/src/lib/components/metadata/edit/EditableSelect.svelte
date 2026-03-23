<script lang="ts">
	/**
	 * EditableSelect - Inline select editing component
	 *
	 * Shows current value as text, opens a <select> dropdown when clicked.
	 * Same visual pattern as EditableText.
	 */
	import { beforeNavigate } from '$app/navigation';

	let {
		value = '',
		options,
		onSave,
		placeholder = 'Select...',
		disabled = false,
		className = ''
	}: {
		value: string;
		options: { value: string; label: string }[];
		onSave: (newValue: string) => void;
		placeholder?: string;
		disabled?: boolean;
		className?: string;
	} = $props();

	let isEditing = $state(false);
	let selectElement = $state<HTMLSelectElement | null>(null);
	let isNavigating = $state(false);

	// Cancel edits when navigation starts
	beforeNavigate(() => {
		isNavigating = true;
		if (isEditing) {
			isEditing = false;
		}
	});

	// Display label for the current value
	const displayLabel = $derived(
		options.find((o) => o.value === value)?.label || value || ''
	);

	function startEditing() {
		if (disabled) return;
		isEditing = true;

		setTimeout(() => {
			if (selectElement) {
				selectElement.focus();
			}
		}, 0);
	}

	function handleChange(e: Event) {
		const newValue = (e.target as HTMLSelectElement).value;
		if (newValue !== value) {
			onSave(newValue);
		}
		isEditing = false;
	}

	function handleBlur() {
		isEditing = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			isEditing = false;
		}
	}
</script>

{#if isEditing}
	<select
		bind:this={selectElement}
		value={value}
		onchange={handleChange}
		onblur={handleBlur}
		onkeydown={handleKeydown}
		class="rounded border border-primary px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary {className}"
	>
		{#if !value}
			<option value="" disabled>{placeholder}</option>
		{/if}
		{#each options as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
{:else}
	<button
		onclick={startEditing}
		{disabled}
		class="group rounded px-2 py-1 text-left text-sm transition-colors
		       {disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-muted'}
		       {className}"
		title={disabled ? 'Read-only' : 'Click to edit'}
	>
		{#if displayLabel}
			<span class="group-hover:underline">{displayLabel}</span>
		{:else}
			<span class="text-muted-foreground italic">{placeholder}</span>
		{/if}
		{#if !disabled}
			<span class="ml-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100">▾</span>
		{/if}
	</button>
{/if}
