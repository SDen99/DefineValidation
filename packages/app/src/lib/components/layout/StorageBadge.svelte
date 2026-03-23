<script lang="ts">
	import { formatStorageSize } from '$lib/utils/utilFunctions';
	import { Badge } from '@sden99/ui-components';

	let storageUsage = $state('');

	async function updateStorageUsage() {
		try {
			const estimate = await navigator.storage.estimate();
			if (estimate.usage) {
				storageUsage = formatStorageSize(estimate.usage);
			}
		} catch (error) {
			console.warn('Storage estimation not available:', error);
			storageUsage = 'N/A';
		}
	}

	$effect(() => {
		updateStorageUsage();
		const interval = setInterval(updateStorageUsage, 5000);
		return () => clearInterval(interval);
	});
</script>

<Badge variant="secondary">
	DB Size: {storageUsage}
</Badge>
