<script lang="ts">
	let {
		position,
		onResize,
		onCollapse
	}: {
		position: 'left' | 'right';
		onResize: (delta: number) => void;
		onCollapse?: () => void;
	} = $props();

	let isDragging = $state(false);
	let startX = $state(0);
	let rafId = $state<number | null>(null);

	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
		startX = e.clientX;
		e.preventDefault();
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;

		// Use requestAnimationFrame for smooth updates
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
		}

		rafId = requestAnimationFrame(() => {
			const delta = position === 'left' ? e.clientX - startX : startX - e.clientX;
			onResize(delta);
			startX = e.clientX;
			rafId = null;
		});
	}

	function handleMouseUp() {
		isDragging = false;
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	// Use Svelte 5 $effect instead of onMount
	$effect(() => {
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
			}
		};
	});
</script>

<div class="group absolute top-0 z-50 h-full" class:left-full={position === 'left'} class:right-full={position === 'right'}>
	<!-- Resize line -->
	<div
		class="absolute top-0 h-full cursor-col-resize border-0 p-0 transition-all duration-150"
		class:bg-transparent={!isDragging}
		class:hover:bg-blue-500={!isDragging}
		class:bg-blue-500={isDragging}
		style="width: {isDragging ? '2px' : '1px'};"
		onmousedown={handleMouseDown}
		role="separator"
		aria-label="Resize {position} sidebar"
		tabindex="0"
	></div>

	<!-- Collapse button (shown on hover) -->
	{#if onCollapse}
		<button
			class="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer p-2 z-[60]"
			onclick={(e) => {
				e.stopPropagation();
				onCollapse();
			}}
			onmousedown={(e) => {
				e.stopPropagation();
			}}
			title="Collapse sidebar"
			type="button"
		>
			<div class="bg-blue-500 hover:bg-blue-600 rounded-full p-0.5 transition-colors">
				<svg
					class="h-4 w-4 text-white pointer-events-none"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					class:rotate-180={position === 'right'}
				>
					<!-- Chevron pointing left for left sidebar, right for right sidebar -->
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</div>
		</button>
	{/if}
</div>

<style>
	/* Increase hit area for better UX - wider hover zone for resize line */
	div[role='separator']::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		width: 16px;
		left: -8px;
		z-index: 50;
	}
</style>
