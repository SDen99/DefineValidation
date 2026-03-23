<script lang="ts">
	import { GripVertical } from '@lucide/svelte/icons';

	let { disabled = false } = $props<{
		disabled?: boolean;
	}>();
</script>

<div
	class="hover:bg-muted/80 active:bg-muted cursor-move rounded
         p-1.5 transition-colors
         {disabled ? 'cursor-not-allowed opacity-50' : ''}"
	role="button"
	aria-label="Drag to reorder column"
	tabindex={disabled ? -1 : 0}
>
	<GripVertical class="text-muted-foreground h-4 w-4" />
</div>