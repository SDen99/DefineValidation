<script lang="ts">
	let { onResize, onAutoFit } = $props<{
		onResize: (width: number) => void;
		onAutoFit?: () => void;
	}>();

	let isResizing = $state(false);
	let startX = $state(0);
	let startWidth = $state(0);
	let resizeHandle = $state<HTMLElement | null>(null);

	// Cleanup effect to prevent memory leaks
	$effect(() => {
		return () => {
			// Clean up event listeners if component unmounts during resize
			if (isResizing) {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('mouseup', handleMouseUp);
			}
		};
	});

	function handleMouseDown(e: MouseEvent) {
		const handleRect = resizeHandle?.getBoundingClientRect();
		if (!handleRect) return;

		// Only handle clicks within the resize handle's bounds (right edge)
		if (e.clientX >= handleRect.left && e.clientX <= handleRect.right) {
			e.preventDefault();
			e.stopPropagation();
			startResizing(e.pageX);
			return;
		}

		// CRITICAL: Do NOT call stopPropagation if click is outside our bounds
		// This allows drag handles and other interactive elements to work
	}

	function startResizing(pageX: number) {
		isResizing = true;
		startX = pageX;

		const headerCell = resizeHandle?.closest('th');
		if (headerCell) {
			startWidth = headerCell.offsetWidth;
		}

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isResizing) return;

		const diff = e.pageX - startX;
		const clampedDiff = Math.max(-startWidth + 50, diff);
		const newWidth = startWidth + clampedDiff;

		onResize(newWidth);
	}

	function handleMouseUp() {
		isResizing = false;
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('mouseup', handleMouseUp);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			e.stopPropagation();
			const headerCell = resizeHandle?.closest('th');
			if (headerCell) {
				onResize(headerCell.offsetWidth + (e.shiftKey ? -10 : 10));
			}
		}
	}

	function handleClick(e: MouseEvent) {
		// Prevent click events from bubbling up to the column header
		e.preventDefault();
		e.stopPropagation();
	}
</script>

<button
	bind:this={resizeHandle}
	type="button"
	class="resize-handle h-full w-4 cursor-col-resize border-none bg-transparent pointer-events-auto
		   focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-colors"
	class:resizing={isResizing}
	style="position: absolute; top: 0; right: 0; z-index: 20;"
	onmousedown={handleMouseDown}
	onkeydown={handleKeyDown}
	onclick={handleClick}
	ondblclick={onAutoFit}
	aria-label="Resize column"
	tabindex="-1"
>
	<div
		class="divider h-full pointer-events-none transition-all"
		style="position: absolute; top: 0; right: 0;"
		class:w-0.5={!isResizing}
		class:w-1={isResizing}
		class:bg-transparent={!isResizing}
		class:bg-primary={isResizing}
	></div>
</button>

<style>
	.resize-handle:hover:not(.resizing) {
		background-color: hsl(var(--primary) / 0.2);
	}

	.resize-handle.resizing {
		background-color: hsl(var(--primary) / 0.3);
	}

	.resize-handle:hover:not(.resizing) .divider {
		background-color: hsl(var(--primary));
	}
</style>