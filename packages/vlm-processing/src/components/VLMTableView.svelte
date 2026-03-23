<script lang="ts">
  import type { VLMTableProps } from './types';

  // Props
  let {
    vlms,
    showStratification = true,
    enableSorting = true,
    enableFiltering = true,
    onVLMSelect
  }: VLMTableProps = $props();

  // Component logic will be implemented during migration
</script>

<div class="p-4 border border-border rounded-lg">
  <h3>VLM Table View</h3>
  <p>Total VLMs: {vlms.length}</p>
</div>