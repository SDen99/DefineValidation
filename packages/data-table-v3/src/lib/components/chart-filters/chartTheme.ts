/**
 * Chart Theme Colors
 *
 * Provides consistent theme-aware colors for chart filter components.
 * Detects dark mode and reads accent color from CSS variables.
 */

export interface ChartColors {
	bar: string;
	barHover: string;
	barSelected: string;
	barMuted: string;
	barGhost: string; // Ghost overlay (original distribution behind filtered)
	text: string;
	textMuted: string;
	// Brush colors
	brushFill: string;
	brushStroke: string;
	brushHandle: string;
	// Statistical indicator lines
	meanLine: string;
	medianLine: string;
}

/**
 * Get the primary/accent color from CSS variables
 */
function getAccentColor(): string {
	if (typeof document === 'undefined') return 'hsl(217 91% 60%)';
	const style = getComputedStyle(document.documentElement);
	return style.getPropertyValue('--color-primary').trim() || 'hsl(217 91% 60%)';
}

/**
 * Convert a color string to its equivalent with opacity.
 * Supports HSL (hsl(h s% l%) or hsl(h, s%, l%)) and hex (#rgb or #rrggbb) formats.
 */
function withOpacity(color: string, opacity: number): string {
	// Handle HSL format: "hsl(h s% l%)" or "hsl(h, s%, l%)"
	const hslMatch = color.match(/hsl\(?\s*([\d.]+)[,\s]+([\d.]+)%?[,\s]+([\d.]+)%?\s*\)?/);
	if (hslMatch) {
		return `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${opacity})`;
	}

	// Handle hex format: #rgb or #rrggbb
	const hexMatch = color.match(/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/);
	if (hexMatch) {
		let hex = hexMatch[1];
		// Expand shorthand #rgb to #rrggbb
		if (hex.length === 3) {
			hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
		}
		const r = parseInt(hex.slice(0, 2), 16);
		const g = parseInt(hex.slice(2, 4), 16);
		const b = parseInt(hex.slice(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${opacity})`;
	}

	// Fallback: return original color
	return color;
}

const DARK_COLORS_BASE = {
	bar: 'hsl(215 20% 55%)',
	barHover: 'hsl(215 25% 65%)',
	barMuted: 'hsl(215 15% 35%)',
	barGhost: 'hsla(215, 20%, 55%, 0.25)',
	text: 'hsl(210 20% 90%)',
	textMuted: 'hsl(215 10% 55%)'
};

const LIGHT_COLORS_BASE = {
	bar: 'hsl(220 15% 50%)',
	barHover: 'hsl(220 20% 40%)',
	barMuted: 'hsl(220 10% 80%)',
	barGhost: 'hsla(220, 15%, 50%, 0.25)',
	text: 'hsl(220 15% 20%)',
	textMuted: 'hsl(220 10% 50%)'
};

/**
 * Get theme-appropriate colors for chart rendering.
 * Detects dark mode via the 'dark' class on document.documentElement.
 * Uses the theme's accent/primary color for selections.
 */
export function getChartColors(): ChartColors {
	const isDark =
		typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

	const baseColors = isDark ? DARK_COLORS_BASE : LIGHT_COLORS_BASE;
	const accentColor = getAccentColor();

	return {
		...baseColors,
		barSelected: accentColor,
		brushFill: withOpacity(accentColor, isDark ? 0.25 : 0.2),
		brushStroke: accentColor,
		brushHandle: accentColor,
		// Statistical indicators - blue for mean, orange for median
		meanLine: isDark ? 'rgba(96, 165, 250, 0.7)' : 'rgba(59, 130, 246, 0.6)',
		medianLine: isDark ? 'rgba(251, 146, 60, 0.7)' : 'rgba(234, 88, 12, 0.6)'
	};
}
