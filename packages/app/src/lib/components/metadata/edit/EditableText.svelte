<script lang="ts">
	/**
	 * EditableText - Inline text editing component
	 *
	 * Click to edit mode, Enter to save, Esc to cancel
	 */
	import { beforeNavigate } from '$app/navigation';

	let {
		value = '',
		onSave,
		placeholder = 'Click to edit',
		disabled = false,
		className = ''
	}: {
		value: string;
		onSave: (newValue: string) => void;
		placeholder?: string;
		disabled?: boolean;
		className?: string;
	} = $props();

	let isEditing = $state(false);
	let editValue = $state(value);
	let editStartValue = $state(value); // Track value when editing started
	let inputElement = $state<HTMLInputElement | null>(null);
	let validationError = $state<string | null>(null);
	let isNavigating = $state(false);

	// Cancel edits when navigation starts
	beforeNavigate(() => {
		isNavigating = true;
		if (isEditing) {
			cancel();
		}
	});

	// Update edit value when prop value changes
	$effect(() => {
		if (!isEditing) {
			editValue = value;
			validationError = null;
		} else if (value !== editStartValue) {
			// External change detected (e.g., undo operation), cancel edit to prevent stale data
			editValue = value;
			validationError = null;
			isEditing = false;
		}
	});

	function startEditing() {
		if (disabled) return;

		isEditing = true;
		editValue = value;
		editStartValue = value; // Capture value at edit start

		// Focus input after DOM update
		setTimeout(() => {
			if (inputElement) {
				inputElement.focus();
				inputElement.select();
			}
		}, 0);
	}

	function save() {
		if (!isEditing) return; // Guard: Don't save if already canceled

		const trimmed = editValue.trim();

		// Validation: Required field
		if (!trimmed) {
			validationError = 'This field is required';
			return;
		}

		// Validation: XML-safe characters
		if (/[<>&"']/.test(trimmed)) {
			validationError = "Cannot contain < > & \" '";
			return;
		}

		// Clear validation error
		validationError = null;

		// Save if changed
		if (trimmed !== value.trim()) {
			onSave(trimmed);
		}
		isEditing = false;
	}

	function cancel() {
		if (!isEditing) return; // Guard: Don't cancel if already canceled

		editValue = value;
		validationError = null;
		isEditing = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			save();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancel();
		}
	}

	function handleBlur() {
		// Cancel on blur if navigating, otherwise save
		if (isNavigating) {
			cancel();
		} else {
			save();
		}
	}
</script>

{#if isEditing}
	<div class="inline-block">
		<input
			bind:this={inputElement}
			bind:value={editValue}
			onkeydown={handleKeydown}
			onblur={handleBlur}
			type="text"
			{placeholder}
			class="rounded border border-primary px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary {className}"
		/>
		{#if validationError}
			<div class="mt-1 text-xs text-destructive">{validationError}</div>
		{/if}
	</div>
{:else}
	<button
		onclick={startEditing}
		{disabled}
		class="group rounded px-2 py-1 text-left text-sm transition-colors
		       {disabled ? 'cursor-not-allowed opacity-50' : 'cursor-text hover:bg-muted'}
		       {className}"
		title={disabled ? 'Read-only' : 'Click to edit'}
	>
		{#if value}
			<span class="group-hover:underline">{value}</span>
		{:else}
			<span class="text-muted-foreground italic">{placeholder}</span>
		{/if}
		{#if !disabled}
			<span class="ml-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100">✏</span>
		{/if}
	</button>
{/if}
