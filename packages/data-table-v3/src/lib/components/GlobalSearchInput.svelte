<script lang="ts">
	import type { GlobalFilter } from '../types/filters';

	interface Props {
		filter?: GlobalFilter;
		onFilterChange?: (filter: GlobalFilter | null) => void;
		placeholder?: string;
	}

	let {
		filter,
		onFilterChange,
		placeholder = 'Search across all columns...'
	}: Props = $props();

	// Search state (simple, no complex tracking)
	let value = $state(filter?.value || '');
	let caseSensitive = $state(filter?.caseSensitive || false);
	let enabled = $state(filter?.enabled ?? true);
	let isFocused = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined = $state();

	/**
	 * Sync external filter changes (SIMPLE pattern from old implementation)
	 */
	$effect(() => {
		const filterValue = filter?.value || '';
		const filterCaseSensitive = filter?.caseSensitive || false;

		// Only sync if different (prevents loops)
		if (filterValue !== value || filterCaseSensitive !== caseSensitive) {
			value = filterValue;
			caseSensitive = filterCaseSensitive;
			enabled = filter?.enabled ?? true;
		}
	});

	/**
	 * Handle input changes with debouncing (like old implementation)
	 */
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const inputValue = target.value;
		value = inputValue; // Update reactive state

		// Clear existing timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// Set new timer
		debounceTimer = setTimeout(() => {
			if (inputValue.trim()) {
				const newFilter: GlobalFilter = {
					type: 'global',
					value: inputValue.trim(),
					caseSensitive,
					enabled
				};
				onFilterChange?.(newFilter);
			} else {
				onFilterChange?.(null);
			}
		}, 300);
	}

	/**
	 * Clear filter
	 */
	function clearFilter() {
		value = '';
		caseSensitive = false;
		enabled = true;
		onFilterChange?.(null);
	}

	/**
	 * Handle keyboard shortcuts
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			clearFilter();
		}
	}

	/**
	 * Handle case-sensitive toggle
	 */
	function handleCaseSensitiveToggle() {
		caseSensitive = !caseSensitive;

		// Reapply filter with new case sensitivity
		if (value.trim()) {
			const newFilter: GlobalFilter = {
				type: 'global',
				value: value.trim(),
				caseSensitive,
				enabled
			};
			onFilterChange?.(newFilter);
		}
	}

	// Cleanup timer on destroy
	$effect(() => {
		return () => {
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}
		};
	});

	// Derived values
	const hasValue = $derived(value.trim().length > 0);
	const isActive = $derived(filter !== undefined && hasValue);
</script>

<div class="global-search" class:focused={isFocused} class:active={isActive}>
	<!-- Search Icon -->
	<div class="search-icon">
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
	</div>

	<!-- Input -->
	<input
		type="text"
		{value}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onfocus={() => (isFocused = true)}
		onblur={() => (isFocused = false)}
		{placeholder}
		class="search-input"
		aria-label="Global search"
	/>

	<!-- Clear Button -->
	{#if hasValue}
		<button onclick={clearFilter} class="clear-button" title="Clear search" aria-label="Clear search">
			<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>
	{/if}

	<!-- Case Sensitive Toggle (visible when focused or has value) -->
	{#if isFocused || hasValue}
		<div class="search-options">
			<label class="checkbox-label">
				<input
					type="checkbox"
					checked={caseSensitive}
					onchange={handleCaseSensitiveToggle}
					class="checkbox"
				/>
				<span class="text-xs">Aa</span>
			</label>
		</div>
	{/if}

	<!-- Active Indicator -->
	{#if isActive}
		<div class="active-indicator">
			<span class="pulse"></span>
		</div>
	{/if}
</div>

<!-- Keyboard Shortcuts Help -->
{#if isFocused}
	<div class="search-help">
		<span class="help-text">
			<kbd>Enter</kbd> to search • <kbd>Esc</kbd> to clear
		</span>
	</div>
{/if}

<style>
	.global-search {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		transition: all 0.2s;
	}

	:global(.dark) .global-search {
		background: #1f2937;
		border-color: #4b5563;
	}

	.global-search.focused {
		border-color: #3b82f6;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.1),
			0 1px 2px 0 rgba(0, 0, 0, 0.05);
	}

	.global-search.active {
		background: #eff6ff;
		border-color: #3b82f6;
	}

	:global(.dark) .global-search.active {
		background: #1e3a8a;
		border-color: #3b82f6;
	}

	.search-icon {
		color: #9ca3af;
		flex-shrink: 0;
		transition: color 0.2s;
	}

	:global(.dark) .search-icon {
		color: #6b7280;
	}

	.global-search.focused .search-icon,
	.global-search.active .search-icon {
		color: #3b82f6;
	}

	.search-input {
		flex: 1;
		padding: 0;
		font-size: 0.9375rem;
		color: #111827;
		background: transparent;
		border: none;
		outline: none;
	}

	:global(.dark) .search-input {
		color: #f9fafb;
	}

	.search-input::placeholder {
		color: #9ca3af;
	}

	:global(.dark) .search-input::placeholder {
		color: #6b7280;
	}

	.clear-button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		color: #6b7280;
		background: transparent;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: all 0.15s;
		flex-shrink: 0;
	}

	:global(.dark) .clear-button {
		color: #9ca3af;
	}

	.clear-button:hover {
		color: #ef4444;
		background: #fef2f2;
	}

	:global(.dark) .clear-button:hover {
		color: #f87171;
		background: #7f1d1d;
	}

	.search-options {
		display: flex;
		align-items: center;
		padding-left: 0.5rem;
		border-left: 1px solid #e5e7eb;
		flex-shrink: 0;
	}

	:global(.dark) .search-options {
		border-left-color: #4b5563;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		cursor: pointer;
		user-select: none;
		color: #111827;
	}

	:global(.dark) .checkbox-label {
		color: #f9fafb;
	}

	.checkbox {
		width: 1rem;
		height: 1rem;
		accent-color: #3b82f6;
		cursor: pointer;
	}

	.active-indicator {
		position: absolute;
		top: -4px;
		right: -4px;
		flex-shrink: 0;
	}

	.pulse {
		display: block;
		width: 8px;
		height: 8px;
		background: #10b981;
		border-radius: 9999px;
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.search-help {
		margin-top: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
	}

	:global(.dark) .search-help {
		background: #1f2937;
		border-color: #4b5563;
	}

	.help-text {
		font-size: 0.75rem;
		color: #6b7280;
	}

	:global(.dark) .help-text {
		color: #9ca3af;
	}

	kbd {
		padding: 0.125rem 0.375rem;
		font-size: 0.75rem;
		font-family: monospace;
		color: #374151;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
	}

	:global(.dark) kbd {
		color: #e5e7eb;
		background: #374151;
		border-color: #6b7280;
	}
</style>
