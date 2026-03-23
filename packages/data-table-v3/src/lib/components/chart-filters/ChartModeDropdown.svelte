<script lang="ts">
	/**
	 * ChartModeDropdown - Toggle between bar, smooth line, and linear line chart modes
	 */
	import { DropdownMenu } from 'bits-ui';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Activity from '@lucide/svelte/icons/activity';

	export type ChartDisplayMode = 'bar' | 'line-smooth' | 'line-linear';

	interface Props {
		mode: ChartDisplayMode;
		onModeChange: (mode: ChartDisplayMode) => void;
	}

	let { mode, onModeChange }: Props = $props();

	const modes: { value: ChartDisplayMode; label: string; icon: typeof BarChart3 }[] = [
		{ value: 'bar', label: 'Bar chart', icon: BarChart3 },
		{ value: 'line-smooth', label: 'Smooth line', icon: TrendingUp },
		{ value: 'line-linear', label: 'Linear line', icon: Activity }
	];

	const currentMode = $derived(modes.find((m) => m.value === mode) ?? modes[0]);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="chart-mode-trigger" title={currentMode.label}>
		<currentMode.icon size={14} />
	</DropdownMenu.Trigger>

	<DropdownMenu.Portal>
		<DropdownMenu.Content class="chart-mode-content" sideOffset={4} align="end">
			{#each modes as m (m.value)}
				<DropdownMenu.Item
					class="chart-mode-item {mode === m.value ? 'active' : ''}"
					onSelect={() => onModeChange(m.value)}
				>
					<m.icon size={14} />
					<span>{m.label}</span>
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>

<style>
	:global(.chart-mode-trigger) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--color-muted-foreground, #71717a);
		cursor: pointer;
		transition: all 0.15s;
	}

	:global(.chart-mode-trigger:hover) {
		background: var(--color-accent, #f4f4f5);
		color: var(--color-foreground, #09090b);
	}

	:global(.chart-mode-content) {
		min-width: 140px;
		padding: 4px;
		background: var(--color-popover, #ffffff);
		border: 1px solid var(--color-border, #e4e4e7);
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 50;
	}

	:global(.chart-mode-item) {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border-radius: 4px;
		font-size: 12px;
		color: var(--color-foreground, #09090b);
		cursor: pointer;
		transition: background 0.15s;
	}

	:global(.chart-mode-item:hover) {
		background: var(--color-accent, #f4f4f5);
	}

	:global(.chart-mode-item.active) {
		background: var(--color-primary, #3b82f6);
		color: var(--color-primary-foreground, #ffffff);
	}
</style>
