<script lang="ts">
	import Upload from '@lucide/svelte/icons/upload';
	import { Button } from '@sden99/ui-components';
	let { handleFileChangeEvent, accept = '.sas7bdat,.xpt,.xml,.json,.yaml,.yml' } = $props();
	let fileInput = $state<HTMLInputElement | null>(null);

	function triggerFileInput() {
		fileInput?.click();
	}
</script>

<!-- Hidden file input -->
<input
	bind:this={fileInput}
	type="file"
	accept={accept}
	multiple
	class="hidden"
	onchange={handleFileChangeEvent}
/>

<Button onclick={triggerFileInput} variant="outline" class="gap-2">
	<Upload class="h-4 w-4" />
	Upload Files
</Button>
