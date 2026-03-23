<script lang="ts">
	/**
	 * EditableTextArea - Inline textarea editing component
	 *
	 * Click to edit mode, Ctrl+Enter to save, Esc to cancel
	 */
	import { beforeNavigate } from '$app/navigation';

	let {
		value = '',
		onSave,
		placeholder = 'Click to edit',
		disabled = false,
		className = '',
		rows = 3
	}: {
		value: string;
		onSave: (newValue: string) => void;
		placeholder?: string;
		disabled?: boolean;
		className?: string;
		rows?: number;
	} = $props();

	let isEditing = $state(false);
	let editValue = $state(value);
	let editStartValue = $state(value); // Track value when editing started
	let textareaElement = $state<HTMLTextAreaElement | null>(null);
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

		// Focus textarea after DOM update
		setTimeout(() => {
			if (textareaElement) {
				textareaElement.focus();
				textareaElement.select();
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
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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
	<div class="relative">
		<textarea
			bind:this={textareaElement}
			bind:value={editValue}
			onkeydown={handleKeydown}
			onblur={handleBlur}
			{placeholder}
			{rows}
			class="w-full rounded border border-primary px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary {className}"
		></textarea>
		{#if validationError}
			<div class="mt-1 text-xs text-destructive">{validationError}</div>
		{:else}
			<div class="mt-1 text-xs text-muted-foreground">
				Ctrl+Enter to save, Esc to cancel
			</div>
		{/if}
	</div>
{:else}
	<button
		onclick={startEditing}
		{disabled}
		class="group block w-full rounded px-2 py-1 text-left text-sm transition-colors
		       {disabled ? 'cursor-not-allowed opacity-50' : 'cursor-text hover:bg-muted'}
		       {className}"
		title={disabled ? 'Read-only' : 'Click to edit'}
	>
		{#if value}
			<span class="whitespace-pre-wrap group-hover:underline">{value}</span>
		{:else}
			<span class="text-muted-foreground italic">{placeholder}</span>
		{/if}
		{#if !disabled}
			<span class="ml-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100">✏</span>
		{/if}
	</button>
{/if}
