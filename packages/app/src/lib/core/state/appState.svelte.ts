// packages/app/src/lib/core/state/appState.svelte.ts

/**
 * Application UI State Module
 *
 * STATE MANAGEMENT PATTERN: { value: T } Wrapper
 * ================================================
 * This module uses the "wrapper pattern" for cross-module reactivity in Svelte 5.
 *
 * WHY THE WRAPPER PATTERN?
 * - When exporting $state from .svelte.ts files, direct reassignments don't work across modules
 * - Wrapping in { value: T } creates a stable object reference that importing modules can track
 * - The .value property can change reactively while the object reference stays constant
 *
 * CORRECT USAGE IN COMPONENTS:
 *   import * as appState from '$lib/core/state/appState.svelte.ts';
 *
 *   // In Svelte 5 component:
 *   let isOpen = $derived(appState.leftSidebarOpen.value);
 *
 *   // Update state:
 *   appState.leftSidebarOpen.value = true;
 *   // OR use helper functions:
 *   appState.toggleSidebar('left');
 *
 * See: https://svelte.dev/docs/svelte/$state#Passing-state-across-modules
 */

// ============================================
// EXPORTED STATE - Directly accessible & reactive
// ============================================

// Sidebar State
export const leftSidebarOpen = $state<{ value: boolean }>({ value: true });
export const rightSidebarOpen = $state<{ value: boolean }>({ value: false });
export const leftSidebarWidth = $state<{ value: number }>({ value: 320 });
export const rightSidebarWidth = $state<{ value: number }>({ value: 320 });
export const editHistorySidebarOpen = $state<{ value: boolean }>({ value: true }); // Edit History expanded by default
export const editHistorySidebarWidth = $state<{ value: number }>({ value: 288 }); // 18rem default

// Top-level app view (state-based navigation for Domino iframe compatibility)
export const appView = $state<{ value: 'datasets' | 'rules' }>({ value: 'datasets' });

// Rule filter state — persisted per tab
export type RuleTabFilters = {
	searchTerm: string;
	ruleTypes: string[];
	domains: string[];
	targetVars: string[];
	violationsOnly: boolean;
};

export const ruleFilters = $state<{ value: Record<string, RuleTabFilters> }>({
	value: {}
});

export function getRuleTabFilters(tab: string): RuleTabFilters {
	return ruleFilters.value[tab] ?? {
		searchTerm: '',
		ruleTypes: [],
		domains: [],
		targetVars: [],
		violationsOnly: false
	};
}

export function setRuleTabFilters(tab: string, filters: RuleTabFilters) {
	ruleFilters.value = { ...ruleFilters.value, [tab]: filters };
}

// Pending rule violation filter — set by Rules page "View" button, consumed by dataset detail page
export const pendingRuleFilter = $state<{ value: string | null }>({ value: null });

// View Mode State
export const viewMode = $state<{ value: 'data' | 'metadata' }>({ value: 'data' });
export const metadataViewMode = $state<{ value: 'table' | 'card' }>({ value: 'table' });

// Per-dataset tab memory - remembers last active tab for each dataset
export const datasetTabMemory = $state<{ value: Record<string, 'data' | 'metadata'> }>({
	value: {}
});

// Simple functions that take datasets as parameter to avoid circular dependencies
export function getHasSDTM(datasets: Record<string, any>): boolean {
	return Object.values(datasets).some(
		(dataset) =>
			dataset.data &&
			typeof dataset.data === 'object' &&
			'MetaData' in dataset.data &&
			(dataset.data as any).MetaData?.OID?.includes('SDTM')
	);
}

export function getHasADaM(datasets: Record<string, any>): boolean {
	return Object.values(datasets).some(
		(dataset) =>
			dataset.data &&
			typeof dataset.data === 'object' &&
			'MetaData' in dataset.data &&
			(dataset.data as any).MetaData?.OID?.includes('ADaM')
	);
}

export function getHasSEND(datasets: Record<string, any>): boolean {
	return Object.values(datasets).some(
		(dataset) =>
			dataset.data &&
			typeof dataset.data === 'object' &&
			'MetaData' in dataset.data &&
			(dataset.data as any).MetaData?.OID?.includes('SEND')
	);
}

// Theme State (optional - could stay separate if you prefer)
export const theme = $state<{
	value: {
		mode: 'light' | 'dark' | 'system';
		fontSize: 'small' | 'medium' | 'large';
		contrast: 'default' | 'high';
		colorAccent: 'default' | 'blue' | 'green' | 'red' | 'purple';
		reducedMotion: boolean;
		followSystem: boolean;
	};
}>({
	value: {
		mode: 'system',
		fontSize: 'medium',
		contrast: 'default',
		colorAccent: 'default',
		reducedMotion: false,
		followSystem: true
	}
});

// Application Preferences
export const preferences = $state<{
	value: {
		autoSave: boolean;
		debugMode: boolean;
		showTooltips: boolean;
		animationsEnabled: boolean;
		showPerformanceDashboard: boolean;
	};
}>({
	value: {
		autoSave: true,
		debugMode: false,
		showTooltips: true,
		animationsEnabled: true,
		showPerformanceDashboard: false
	}
});

// ============================================
// SIDEBAR ACTIONS
// ============================================

export function resetLeftSidebar() {
	leftSidebarOpen.value = true; // Default state
	leftSidebarWidth.value = 240; // Default width
}

export function resetRightSidebar() {
	rightSidebarOpen.value = false; // Default state
	rightSidebarWidth.value = 320; // Default width
}

export function resetSidebars() {
	resetLeftSidebar();
	resetRightSidebar();
}

export function setTheme(newTheme: 'light' | 'dark' | 'system') {
	// Update only the mode property of the theme object
	theme.value = {
		...theme.value,
		mode: newTheme
	};
}

export function restorePreferences(prefs: Partial<{
	theme: 'light' | 'dark' | 'system';
	leftSidebarOpen: boolean;
	rightSidebarOpen: boolean;
	leftSidebarWidth: number;
	rightSidebarWidth: number;
}>) {
	if (prefs.theme && ['light', 'dark', 'system'].includes(prefs.theme)) {
		setTheme(prefs.theme);
	}
	if (typeof prefs.leftSidebarOpen === 'boolean') {
		leftSidebarOpen.value = prefs.leftSidebarOpen;
	}
	if (typeof prefs.rightSidebarOpen === 'boolean') {
		rightSidebarOpen.value = prefs.rightSidebarOpen;
	}
	if (typeof prefs.leftSidebarWidth === 'number') {
		leftSidebarWidth.value = prefs.leftSidebarWidth;
	}
	if (typeof prefs.rightSidebarWidth === 'number') {
		rightSidebarWidth.value = prefs.rightSidebarWidth;
	}
}

export function toggleSidebar(side: 'left' | 'right') {
	console.log(`appState.toggleSidebar: ${side}`);

	if (side === 'left') {
		leftSidebarOpen.value = !leftSidebarOpen.value;
	} else {
		rightSidebarOpen.value = !rightSidebarOpen.value;
	}
}

export function setSidebarOpen(side: 'left' | 'right', open: boolean) {
	console.log(`appState.setSidebarOpen: ${side} = ${open}`);

	if (side === 'left') {
		leftSidebarOpen.value = open;
	} else {
		rightSidebarOpen.value = open;
	}
}

export function updateSidebarWidth(side: 'left' | 'right', width: number) {
	// Clamp width between reasonable bounds
	const clampedWidth = Math.max(200, Math.min(600, width));

	if (side === 'left') {
		leftSidebarWidth.value = clampedWidth;
	} else {
		rightSidebarWidth.value = clampedWidth;
	}
}

// ============================================
// VIEW MODE ACTIONS
// ============================================

export function setViewMode(mode: 'data' | 'metadata', datasetKey?: string) {
	console.log(`appState.setViewMode: ${mode}`, datasetKey ? `for dataset: ${datasetKey}` : '');
	viewMode.value = mode;

	// Remember this choice for the specific dataset
	if (datasetKey) {
		datasetTabMemory.value[datasetKey] = mode;
		console.log(`appState: Saved tab preference for ${datasetKey}: ${mode}`);
	}
}

export function setMetadataViewMode(mode: 'table' | 'card') {
	console.log(`appState.setMetadataViewMode: ${mode}`);
	metadataViewMode.value = mode;
}

export function toggleMetadataViewMode() {
	const newMode = metadataViewMode.value === 'table' ? 'card' : 'table';
	setMetadataViewMode(newMode);
}

// ============================================
// THEME ACTIONS
// ============================================

export function setThemeMode(mode: 'light' | 'dark' | 'system') {
	console.log(`appState.setThemeMode: ${mode}`);
	theme.value = { ...theme.value, mode };
}

export function setFontSize(fontSize: 'small' | 'medium' | 'large') {
	console.log(`appState.setFontSize: ${fontSize}`);
	theme.value = { ...theme.value, fontSize };
}

export function setContrast(contrast: 'default' | 'high') {
	console.log(`appState.setContrast: ${contrast}`);
	theme.value = { ...theme.value, contrast };
}

export function setColorAccent(colorAccent: 'default' | 'blue' | 'green' | 'red' | 'purple') {
	console.log(`appState.setColorAccent: ${colorAccent}`);
	theme.value = { ...theme.value, colorAccent };
}

export function toggleReducedMotion() {
	const newValue = !theme.value.reducedMotion;
	console.log(`appState.toggleReducedMotion: ${newValue}`);
	theme.value = { ...theme.value, reducedMotion: newValue };
}

export function toggleFollowSystem() {
	const newValue = !theme.value.followSystem;
	console.log(`appState.toggleFollowSystem: ${newValue}`);
	theme.value = { ...theme.value, followSystem: newValue };
}

// ============================================
// PREFERENCE ACTIONS
// ============================================

export function setAutoSave(enabled: boolean) {
	console.log(`appState.setAutoSave: ${enabled}`);
	preferences.value = { ...preferences.value, autoSave: enabled };
}

export function toggleDebugMode() {
	const newValue = !preferences.value.debugMode;
	console.log(`appState.toggleDebugMode: ${newValue}`);
	preferences.value = { ...preferences.value, debugMode: newValue };
}

export function togglePerformanceDashboard() {
	const newValue = !preferences.value.showPerformanceDashboard;
	preferences.value = { ...preferences.value, showPerformanceDashboard: newValue };
}

export function setShowTooltips(enabled: boolean) {
	console.log(`appState.setShowTooltips: ${enabled}`);
	preferences.value = { ...preferences.value, showTooltips: enabled };
}

export function setAnimationsEnabled(enabled: boolean) {
	console.log(`appState.setAnimationsEnabled: ${enabled}`);
	preferences.value = { ...preferences.value, animationsEnabled: enabled };
}

// ============================================
// STATE MANAGEMENT ACTIONS
// ============================================

export function restoreAppState(savedState: {
	leftSidebarOpen?: boolean;
	rightSidebarOpen?: boolean;
	leftSidebarWidth?: number;
	rightSidebarWidth?: number;
	editHistorySidebarOpen?: boolean;
	editHistorySidebarWidth?: number;
	viewMode?: 'data' | 'metadata';
	metadataViewMode?: 'table' | 'card';
	theme?: typeof theme.value;
	preferences?: typeof preferences.value;
}) {
	console.log('appState.restoreAppState:', savedState);

	// Restore sidebar state
	if (savedState.leftSidebarOpen !== undefined) {
		leftSidebarOpen.value = savedState.leftSidebarOpen;
	}
	if (savedState.rightSidebarOpen !== undefined) {
		rightSidebarOpen.value = savedState.rightSidebarOpen;
	}
	if (savedState.leftSidebarWidth !== undefined) {
		leftSidebarWidth.value = savedState.leftSidebarWidth;
	}
	if (savedState.rightSidebarWidth !== undefined) {
		rightSidebarWidth.value = savedState.rightSidebarWidth;
	}
	if (savedState.editHistorySidebarOpen !== undefined) {
		editHistorySidebarOpen.value = savedState.editHistorySidebarOpen;
	}
	if (savedState.editHistorySidebarWidth !== undefined) {
		editHistorySidebarWidth.value = savedState.editHistorySidebarWidth;
	}

	// Restore view modes
	if (savedState.viewMode !== undefined) {
		viewMode.value = savedState.viewMode;
	}
	if (savedState.metadataViewMode !== undefined) {
		metadataViewMode.value = savedState.metadataViewMode;
	}

	// Restore theme
	if (savedState.theme) {
		theme.value = { ...theme.value, ...savedState.theme };
	}

	// Restore preferences
	if (savedState.preferences) {
		preferences.value = { ...preferences.value, ...savedState.preferences };
	}
}

export function resetAppState() {
	console.log('appState.resetAppState');

	// Reset to defaults
	leftSidebarOpen.value = true;
	rightSidebarOpen.value = false;
	leftSidebarWidth.value = 320;
	rightSidebarWidth.value = 320;
	editHistorySidebarOpen.value = true;
	editHistorySidebarWidth.value = 288;
	viewMode.value = 'data';
	metadataViewMode.value = 'table';

	theme.value = {
		mode: 'system',
		fontSize: 'medium',
		contrast: 'default',
		colorAccent: 'default',
		reducedMotion: false,
		followSystem: true
	};

	preferences.value = {
		autoSave: true,
		debugMode: false,
		showTooltips: true,
		animationsEnabled: true,
		showPerformanceDashboard: false
	};
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getSidebarWidth(side: 'left' | 'right'): number {
	return side === 'left' ? leftSidebarWidth.value : rightSidebarWidth.value;
}

export function isSidebarOpen(side: 'left' | 'right'): boolean {
	return side === 'left' ? leftSidebarOpen.value : rightSidebarOpen.value;
}

export function shouldShowRightSidebar(): boolean {
	return rightSidebarOpen.value && viewMode.value === 'data';
}

export function hasAnyDefineXML(datasets: Record<string, any>): boolean {
	return getHasSDTM(datasets) || getHasADaM(datasets) || getHasSEND(datasets);
}

export function getCurrentThemeMode(): 'light' | 'dark' | 'system' {
	return theme.value.mode;
}

export function isDebugMode(): boolean {
	return preferences.value.debugMode;
}

// ============================================
// CONVENIENCE FUNCTIONS FOR PERSISTENCE
// ============================================

export function getAppStateSnapshot() {
	return {
		leftSidebarOpen: leftSidebarOpen.value,
		rightSidebarOpen: rightSidebarOpen.value,
		leftSidebarWidth: leftSidebarWidth.value,
		rightSidebarWidth: rightSidebarWidth.value,
		editHistorySidebarOpen: editHistorySidebarOpen.value,
		editHistorySidebarWidth: editHistorySidebarWidth.value,
		viewMode: viewMode.value,
		metadataViewMode: metadataViewMode.value,
		theme: { ...theme.value },
		preferences: { ...preferences.value }
	};
}

export function getUIPreferencesSnapshot(datasets: Record<string, any>) {
	// Compatible with existing StorageService format
	return {
		leftSidebarOpen: leftSidebarOpen.value,
		rightSidebarOpen: rightSidebarOpen.value,
		leftSidebarWidth: leftSidebarWidth.value,
		rightSidebarWidth: rightSidebarWidth.value,
		editHistorySidebarOpen: editHistorySidebarOpen.value,
		editHistorySidebarWidth: editHistorySidebarWidth.value,
		viewMode: viewMode.value,
		metadataViewMode: metadataViewMode.value,
		SDTM: getHasSDTM(datasets),
		ADaM: getHasADaM(datasets),
		SEND: getHasSEND(datasets)
	};
}

// ============================================
// LAYOUT COORDINATION FUNCTIONS
// ============================================

export function handleViewModeChange(newMode: 'data' | 'metadata', datasetKey?: string) {
	setViewMode(newMode, datasetKey);

	// Auto-close right sidebar for non-data views
	if (newMode !== 'data' && rightSidebarOpen.value) {
		rightSidebarOpen.value = false;
	}
}

export function getRememberedTabForDataset(datasetKey: string): 'data' | 'metadata' | null {
	return datasetTabMemory.value[datasetKey] || null;
}

export function closeSidebarsOnMobile() {
	// For mobile responsiveness - could be called from a resize handler
	if (typeof window !== 'undefined' && window.innerWidth < 768) {
		leftSidebarOpen.value = false;
		rightSidebarOpen.value = false;
	}
}

// ============================================
// DEBUG EXPORTS (remove in production)
// ============================================

if (typeof window !== 'undefined') {
	// @ts-ignore - for debugging
	window.__appState = {
		leftSidebarOpen,
		rightSidebarOpen,
		leftSidebarWidth,
		rightSidebarWidth,
		viewMode,
		metadataViewMode,
		getHasSDTM, // Expose the getter function
		getHasADaM, // Expose the getter function
		getHasSEND, // Expose the getter function
		theme,
		preferences,
		// Functions for testing
		getAppStateSnapshot,
		resetAppState
	};
}
