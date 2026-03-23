<script lang="ts">
  import type { ProgressBarProps } from './types';

  // Props
  let {
    progress,
    status,
    message,
    showPercentage = true,
    onCancel
  }: ProgressBarProps = $props();

  // Component logic will be implemented during migration
  const progressPercentage = Math.min(100, Math.max(0, progress));
</script>

<div class="p-4 border border-border rounded-lg">
  <div class="flex justify-between mb-2">
    <span class="font-medium text-foreground">{status}</span>
    {#if showPercentage}
      <span class="text-muted-foreground">{progressPercentage.toFixed(0)}%</span>
    {/if}
  </div>

  <div class="w-full h-2 bg-muted rounded-sm overflow-hidden">
    <div class="h-full bg-primary transition-all duration-300 ease-in-out" style="width: {progressPercentage}%"></div>
  </div>

  {#if message}
    <p class="mt-2 text-sm text-muted-foreground">{message}</p>
  {/if}

  {#if onCancel && status === 'processing'}
    <button
      class="mt-2 px-2 py-1 bg-destructive text-destructive-foreground border-none rounded cursor-pointer hover:bg-destructive/90 transition-colors"
      onclick={onCancel}
    >
      Cancel
    </button>
  {/if}
</div>