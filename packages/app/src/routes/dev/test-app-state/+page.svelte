<!-- routes/test-app-state/+page.svelte -->
<script lang="ts">
	import { Button } from '@sden99/ui-components';
	import { Card } from '@sden99/ui-components';
	import { Badge } from '@sden99/ui-components';
	import { Checkbox } from '@sden99/ui-components';

	// Import all app state functions
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';

	// Component-specific derived state - following the established pattern!
	const currentViewMode = $derived(appState.viewMode.value);
	const currentMetadataViewMode = $derived(appState.metadataViewMode.value);
	const currentThemeMode = $derived(appState.theme.value.mode);
	const hasAnyDefineTypes = $derived(appState.hasAnyDefineXML(dataState.getDatasets()));
	const shouldShowRightSidebar = $derived(appState.shouldShowRightSidebar());

	const hasSDTM = $derived(appState.getHasSDTM(dataState.getDatasets()));
	const hasADaM = $derived(appState.getHasADaM(dataState.getDatasets()));

	// Test functions
	function testSidebarToggle() {
		console.log('Testing sidebar toggle...');
		appState.toggleSidebar('left');
		setTimeout(() => appState.toggleSidebar('right'), 500);
	}

	function testSidebarResize() {
		console.log('Testing sidebar resize...');
		appState.updateSidebarWidth('left', 400);
		appState.updateSidebarWidth('right', 250);
	}

	function testViewModes() {
		console.log('Testing view mode changes...');
		appState.setViewMode('metadata');

		setTimeout(() => {
			appState.setViewMode('data');
		}, 2000);
	}

	function testDefineXMLTypes() {
		console.log('Testing Define XML types...');
		// FIXED: This function no longer exists and must be removed.
		// You cannot manually set this state anymore; it is derived from data.
		// appState.setDefineXMLType(true, false);
		// setTimeout(() => { appState.setDefineXMLType(false, true); }, 1000);
		// setTimeout(() => { appState.setDefineXMLType(true, true); }, 2000);
		console.warn(
			'Manual setting of Define XML types is disabled. State is now derived from loaded data.'
		);
	}
	function testThemeChanges() {
		console.log('Testing theme changes...');
		appState.setThemeMode('dark');
		appState.setColorAccent('blue');

		setTimeout(() => {
			appState.setThemeMode('light');
			appState.setColorAccent('green');
		}, 1500);

		setTimeout(() => {
			appState.setThemeMode('system');
			appState.setColorAccent('default');
		}, 3000);
	}

	function testPreferences() {
		console.log('Testing preferences...');
		appState.toggleDebugMode();
		appState.setAutoSave(false);

		setTimeout(() => {
			appState.setAutoSave(true);
			appState.toggleDebugMode();
		}, 2000);
	}

	function resetAllAppState() {
		console.log('Resetting all app state...');
		appState.resetAppState();
	}

	function testStateSnapshot() {
		console.log('Testing state snapshot...');
		const snapshot = appState.getAppStateSnapshot();
		console.log('Current app state snapshot:', snapshot);

		// Test restoration
		const testState = {
			leftSidebarWidth: 500,
			rightSidebarWidth: 200,
			viewMode: 'metadata' as const,
			theme: {
				mode: 'dark' as const,
				fontSize: 'large' as const,
				contrast: 'high' as const,
				colorAccent: 'purple' as const,
				reducedMotion: true,
				followSystem: false
			}
		};

		appState.restoreAppState(testState);

		setTimeout(() => {
			console.log('Restoring original state...');
			appState.restoreAppState(snapshot);
		}, 3000);
	}

	// Debug reactive values
	$effect(() => {
		console.log('App State Debug:', {
			viewMode: currentViewMode,
			metadataViewMode: currentMetadataViewMode,
			themeMode: currentThemeMode,
			sidebars: {
				left: {
					open: appState.leftSidebarOpen.value,
					width: appState.leftSidebarWidth.value
				},
				right: {
					open: appState.rightSidebarOpen.value,
					width: appState.rightSidebarWidth.value
				}
			},
			defineXML: {
				hasSDTM: appState.getHasSDTM(dataState.getDatasets()),
				hasADaM: appState.getHasADaM(dataState.getDatasets()),
				hasAny: hasAnyDefineTypes
			}
		});
	});
</script>

<div class="container mx-auto p-4">
	<Card class="mb-4 p-4">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-2xl font-bold">App State Test</h1>
			<Badge variant="outline">Complete State Migration</Badge>
		</div>

		<div class="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
			<Button onclick={testSidebarToggle} variant="outline" size="sm">Toggle Sidebars</Button>
			<Button onclick={testSidebarResize} variant="outline" size="sm">Resize Sidebars</Button>
			<Button onclick={testViewModes} variant="outline" size="sm">Test View Modes</Button>
			<Button onclick={testDefineXMLTypes} variant="outline" size="sm">Test Define XML</Button>
			<Button onclick={testThemeChanges} variant="outline" size="sm">Test Theme</Button>
			<Button onclick={testPreferences} variant="outline" size="sm">Test Preferences</Button>
			<Button onclick={testStateSnapshot} variant="outline" size="sm">Test Snapshot</Button>
			<Button onclick={resetAllAppState} variant="destructive" size="sm">Reset All</Button>
		</div>
	</Card>

	<!-- State Display -->
	<div class="grid gap-4 lg:grid-cols-2">
		<!-- Sidebar State -->
		<Card class="p-4">
			<h3 class="mb-3 font-semibold">Sidebar State</h3>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">Left Sidebar</span>
					<div class="flex items-center gap-2">
						<Checkbox
							bind:checked={appState.leftSidebarOpen.value}
							onCheckedChange={(checked) => appState.setSidebarOpen('left', !!checked)}
						/>
						<span class="text-muted-foreground text-xs">
							{appState.leftSidebarWidth.value}px
						</span>
					</div>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">Right Sidebar</span>
					<div class="flex items-center gap-2">
						<Checkbox
							bind:checked={appState.rightSidebarOpen.value}
							onCheckedChange={(checked) => appState.setSidebarOpen('right', !!checked)}
						/>
						<span class="text-muted-foreground text-xs">
							{appState.rightSidebarWidth.value}px
						</span>
					</div>
				</div>

				<div class="pt-2">
					<span class="text-sm font-medium">Should Show Right:</span>
					<Badge variant={shouldShowRightSidebar ? 'default' : 'secondary'}>
						{shouldShowRightSidebar ? 'Yes' : 'No'}
					</Badge>
				</div>
			</div>
		</Card>

		<!-- View Mode State -->
		<Card class="p-4">
			<h3 class="mb-3 font-semibold">View Mode State</h3>
			<div class="space-y-3">
				<div>
					<span class="text-sm font-medium">Current View:</span>
					<div class="mt-1 flex gap-2">
						{#each ['data', 'metadata'] as mode}
							<Button
								variant={currentViewMode === mode ? 'default' : 'outline'}
								size="sm"
								onclick={() => appState.setViewMode(mode as 'data' | 'metadata')}
							>
								{mode}
							</Button>
						{/each}
					</div>
				</div>

				<div>
					<span class="text-sm font-medium">Metadata View:</span>
					<div class="mt-1 flex gap-2">
						{#each ['table', 'card'] as mode}
							<Button
								variant={currentMetadataViewMode === mode ? 'default' : 'outline'}
								size="sm"
								disabled={mode === 'card'}
								onclick={() => appState.setMetadataViewMode(mode as 'table' | 'card')}
							>
								{mode}
								{mode === 'card' ? ' (disabled - not implemented)' : ''}
							</Button>
						{/each}
					</div>
				</div>
			</div>
		</Card>

		<!-- Define XML State -->
		<Card class="p-4">
			<h3 class="mb-3 font-semibold">Define XML State</h3>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">SDTM Available</span>
					<!-- FIXED: Use the locally derived reactive variable -->
					<Checkbox checked={hasSDTM} disabled={true} />
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">ADaM Available</span>
					<!-- FIXED: Use the locally derived reactive variable -->
					<Checkbox checked={hasADaM} disabled={true} />
				</div>
				<!-- ... -->
			</div>
		</Card>

		<!-- Theme State -->
		<Card class="p-4">
			<h3 class="mb-3 font-semibold">Theme State</h3>
			<div class="space-y-3">
				<div>
					<span class="text-sm font-medium">Theme Mode:</span>
					<div class="mt-1 flex gap-2">
						{#each ['light', 'dark', 'system'] as mode}
							<Button
								variant={currentThemeMode === mode ? 'default' : 'outline'}
								size="sm"
								onclick={() => appState.setThemeMode(mode as 'light' | 'dark' | 'system')}
							>
								{mode}
							</Button>
						{/each}
					</div>
				</div>

				<div>
					<span class="text-sm font-medium">Font Size:</span>
					<div class="mt-1 flex gap-2">
						{#each ['small', 'medium', 'large'] as size}
							<Button
								variant={appState.theme.value.fontSize === size ? 'default' : 'outline'}
								size="sm"
								onclick={() => appState.setFontSize(size as 'small' | 'medium' | 'large')}
							>
								{size}
							</Button>
						{/each}
					</div>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">Reduced Motion</span>
					<Checkbox
						bind:checked={appState.theme.value.reducedMotion}
						onCheckedChange={() => appState.toggleReducedMotion()}
					/>
				</div>
			</div>
		</Card>

		<!-- Preferences -->
		<Card class="p-4">
			<h3 class="mb-3 font-semibold">Preferences</h3>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">Auto Save</span>
					<Checkbox
						bind:checked={appState.preferences.value.autoSave}
						onCheckedChange={(checked) => appState.setAutoSave(!!checked)}
					/>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">Debug Mode</span>
					<Checkbox
						bind:checked={appState.preferences.value.debugMode}
						onCheckedChange={() => appState.toggleDebugMode()}
					/>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">Show Tooltips</span>
					<Checkbox
						bind:checked={appState.preferences.value.showTooltips}
						onCheckedChange={(checked) => appState.setShowTooltips(!!checked)}
					/>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">Animations</span>
					<Checkbox
						bind:checked={appState.preferences.value.animationsEnabled}
						onCheckedChange={(checked) => appState.setAnimationsEnabled(!!checked)}
					/>
				</div>
			</div>
		</Card>

		<!-- State Summary -->
		<Card class="p-4">
			<h3 class="mb-3 font-semibold">State Summary</h3>
			<div class="space-y-2 text-sm">
				<div>
					<strong>Active View:</strong>
					<Badge>{currentViewMode}</Badge>
				</div>

				<div>
					<strong>Sidebars:</strong>
					{#if appState.leftSidebarOpen.value && shouldShowRightSidebar}
						Both Open
					{:else if appState.leftSidebarOpen.value}
						Left Only
					{:else if shouldShowRightSidebar}
						Right Only
					{:else}
						Both Closed
					{/if}
				</div>

				<div>
					<strong>Theme:</strong>
					{currentThemeMode} / {appState.theme.value.fontSize}
				</div>

				<div>
					<strong>Define XML:</strong>
					{#if appState.getHasSDTM(dataState.getDatasets()) && appState.getHasADaM(dataState.getDatasets())}
						SDTM + ADaM
					{:else if appState.getHasSDTM(dataState.getDatasets())}
						SDTM Only
					{:else if appState.getHasADaM(dataState.getDatasets())}
						ADaM Only
					{:else}
						None
					{/if}
				</div>
			</div>
		</Card>
	</div>

	<!-- Debug Panel -->
	<Card class="mt-4 p-4">
		<h3 class="mb-2 font-semibold">Debug Console</h3>
		<div class="font-mono text-xs">
			<details>
				<summary>Raw State Values</summary>
				<pre class="mt-2 whitespace-pre-wrap">{JSON.stringify(
						appState.getAppStateSnapshot(),
						null,
						2
					)}</pre>
			</details>
			<details class="mt-2">
				<summary>UI Preferences Format</summary>
				<pre class="mt-2 whitespace-pre-wrap">{JSON.stringify(
						appState.getUIPreferencesSnapshot(dataState.getDatasets()),
						null,
						2
					)}</pre>
			</details>
		</div>
	</Card>
</div>
