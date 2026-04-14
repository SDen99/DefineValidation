<script lang="ts">
	import Upload from '@lucide/svelte/icons/upload';
	import { Button } from '@sden99/ui-components';
	let { handleFileChangeEvent, accept = '.sas7bdat,.xpt,.xml,.json,.yaml,.yml' } = $props();
	let fileInput = $state<HTMLInputElement | null>(null);

	function triggerFileInput() {
		const t0 = performance.now();
		console.warn(`[FileUpload] Button clicked at ${t0.toFixed(1)}ms, fileInput exists=${!!fileInput}`);
		fileInput?.click();
		console.warn(`[FileUpload] fileInput.click() returned after ${(performance.now() - t0).toFixed(1)}ms`);
	}

	function onFileChange(event: Event) {
		const t0 = performance.now();
		const files = (event.target as HTMLInputElement).files;
		console.warn(`[FileUpload] File dialog returned: ${files?.length ?? 0} files selected at ${t0.toFixed(1)}ms`);
		handleFileChangeEvent(event);
		console.warn(`[FileUpload] handleFileChangeEvent returned after ${(performance.now() - t0).toFixed(1)}ms`);
	}
</script>

<!-- Hidden file input -->
<input
	bind:this={fileInput}
	type="file"
	accept={accept}
	multiple
	class="hidden"
	onchange={onFileChange}
/>

<Button onclick={triggerFileInput} variant="outline" class="gap-2">
	<Upload class="h-4 w-4" />
	Upload Files
</Button>
