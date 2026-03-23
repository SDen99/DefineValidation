<script lang="ts">
  import type { HierarchyViewerProps } from './types';

  // Props
  let {
    processingResult,
    viewMode = 'table',
    showDetails = true,
    onHierarchySelect
  }: HierarchyViewerProps = $props();

  // Component logic will be implemented during migration
</script>

<div class="p-4 border border-border rounded-lg">
  <h3>VLM Hierarchy Viewer</h3>
  <p>View Mode: {viewMode}</p>
  <p>Hierarchies: {processingResult.hierarchies.length}</p>
</div>