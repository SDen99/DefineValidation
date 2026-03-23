<script lang="ts">
	import { browser } from '$app/environment';
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import { statePersistenceService } from '$lib/core/services/StatePersistenceService';

	let { children } = $props();

	// Track initialization to prevent saving during initial theme restoration
	let themeInitialized = $state(false);

	// Apply theme classes to document element when theme state changes
	$effect(() => {
		if (!browser) return;

		const theme = appState.theme.value;
		const html = document.documentElement;

		// Remove all existing theme classes
		html.className = html.className
			.split(' ')
			.filter(
				(cls) =>
					![
						'dark',
						'font-small',
						'font-medium',
						'font-large',
						'high-contrast',
						'reduced-motion',
						'accent-blue',
						'accent-green',
						'accent-red',
						'accent-purple',
						'accent-orange'
					].includes(cls)
			)
			.join(' ');

		// Apply dark mode class
		let effectiveMode = theme.mode;
		if (theme.mode === 'system') {
			effectiveMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}

		if (effectiveMode === 'dark') {
			html.classList.add('dark');
		}

		// Apply font size class
		if (theme.fontSize !== 'medium') {
			html.classList.add(`font-${theme.fontSize}`);
		}

		// Apply contrast class
		if (theme.contrast === 'high') {
			html.classList.add('high-contrast');
		}

		// Apply accent color class
		if (theme.colorAccent !== 'default') {
			html.classList.add(`accent-${theme.colorAccent}`);
		}

		// Apply reduced motion class
		if (theme.reducedMotion) {
			html.classList.add('reduced-motion');
		}

		console.log(
			'Applied theme classes:',
			html.className
				.split(' ')
				.filter((cls) =>
					[
						'dark',
						'font-small',
						'font-large',
						'high-contrast',
						'reduced-motion',
						'accent-blue',
						'accent-green',
						'accent-red',
						'accent-purple',
						'accent-orange'
					].includes(cls)
				)
		);
	});

	// Listen for system theme changes when in system mode
	$effect(() => {
		if (!browser || appState.theme.value.mode !== 'system') return;

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

		function handleSystemThemeChange() {
			// Trigger a reactive update by updating the theme state
			const currentTheme = appState.theme.value;
			appState.theme.value = { ...currentTheme }; // Force reactivity
		}

		mediaQuery.addEventListener('change', handleSystemThemeChange);

		return () => {
			mediaQuery.removeEventListener('change', handleSystemThemeChange);
		};
	});

	// Mark theme as initialized after component mounts to prevent saving during restoration
	$effect(() => {
		if (!browser) return;

		// Delay initialization flag to allow restoration to complete first
		const timer = setTimeout(() => {
			themeInitialized = true;
			console.log('[ThemeProvider] Theme initialization complete, persistence enabled');
		}, 100);

		return () => clearTimeout(timer);
	});

	// Persist theme changes to localStorage (only after initialization)
	$effect(() => {
		if (!browser || !themeInitialized) return;

		const currentTheme = appState.theme.value;

		statePersistenceService.saveState({
			themePreferences: { ...currentTheme }
		});

		console.log('[ThemeProvider] Persisted theme to localStorage:', currentTheme);
	});
</script>

{@render children()}
