/**
 * Performance Metrics System
 * Svelte-aware performance tracking for dataset operations
 *
 * Key Features:
 * - Reactive state using Svelte 5 runes
 * - Non-reactive timing collection (prevents infinite loops)
 * - Automatic metric aggregation
 * - Memory-safe (auto-cleanup of old metrics)
 */

import { untrack } from 'svelte';

// ============================================
// TYPES
// ============================================

export interface PerformanceMetric {
	name: string;
	startTime: number;
	endTime?: number;
	duration?: number;
	metadata?: Record<string, any>;
	category: 'selection' | 'worker' | 'component' | 'data' | 'other';
}

export interface AggregatedMetrics {
	count: number;
	min: number;
	max: number;
	avg: number;
	p50: number;
	p95: number;
	p99: number;
	last: number;
}

export interface MetricSession {
	sessionId: string;
	startTime: number;
	endTime?: number;
	metrics: PerformanceMetric[];
	totalDuration?: number;
}

// ============================================
// STATE
// ============================================

// Active timers (non-reactive to prevent triggering effects)
const activeTimers = new Map<string, { startTime: number; metadata?: Record<string, any> }>();

// Completed metrics (reactive for UI updates)
const completedMetrics = $state<PerformanceMetric[]>([]);

// Current session tracking
let currentSession = $state<MetricSession | null>(null);

// Configuration
const config = $state({
	enabled: true,
	maxMetrics: 1000, // Prevent memory leaks
	autoCleanup: true,
	logToConsole: true,
	categories: ['selection', 'worker', 'component', 'data', 'other'] as const
});

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Start tracking a performance metric
 * Uses untrack() to prevent Svelte reactivity issues
 */
export function startMetric(
	name: string,
	category: PerformanceMetric['category'] = 'other',
	metadata?: Record<string, any>
): void {
	if (!config.enabled) return;

	untrack(() => {
		const startTime = performance.now();
		const key = `${category}:${name}`;

		activeTimers.set(key, { startTime, metadata });

		if (config.logToConsole) {
			console.log(`[Metrics] ⏱️  Started: ${key}`, metadata || '');
		}
	});
}

/**
 * End tracking and record the metric
 * Uses untrack() to prevent Svelte reactivity during metric collection
 */
export function endMetric(
	name: string,
	category: PerformanceMetric['category'] = 'other',
	additionalMetadata?: Record<string, any>
): PerformanceMetric | null {
	if (!config.enabled) return null;

	return untrack(() => {
		const key = `${category}:${name}`;
		const timer = activeTimers.get(key);

		if (!timer) {
			console.warn(`[Metrics] ⚠️  No active timer found for: ${key}`);
			return null;
		}

		const endTime = performance.now();
		const duration = endTime - timer.startTime;

		const metric: PerformanceMetric = {
			name,
			category,
			startTime: timer.startTime,
			endTime,
			duration,
			metadata: { ...timer.metadata, ...additionalMetadata }
		};

		// Add to completed metrics (this IS reactive for UI)
		completedMetrics.push(metric);

		// Add to current session if active
		if (currentSession) {
			currentSession.metrics.push(metric);
		}

		// Cleanup
		activeTimers.delete(key);

		// Auto-cleanup old metrics
		if (config.autoCleanup && completedMetrics.length > config.maxMetrics) {
			const removeCount = completedMetrics.length - config.maxMetrics;
			completedMetrics.splice(0, removeCount);
			console.log(`[Metrics] 🧹 Cleaned up ${removeCount} old metrics`);
		}

		if (config.logToConsole) {
			console.log(`[Metrics] ✅ Completed: ${key} - ${duration.toFixed(2)}ms`, metric.metadata || '');
		}

		return metric;
	});
}

/**
 * Time an async function (handles both sync and async)
 * Uses untrack() internally
 */
export async function timeAsync<T>(
	name: string,
	category: PerformanceMetric['category'],
	fn: () => T | Promise<T>,
	metadata?: Record<string, any>
): Promise<T> {
	startMetric(name, category, metadata);
	try {
		const result = await fn();
		endMetric(name, category);
		return result;
	} catch (error) {
		endMetric(name, category, { error: error instanceof Error ? error.message : String(error) });
		throw error;
	}
}

/**
 * Time a synchronous function
 */
export function timeSync<T>(
	name: string,
	category: PerformanceMetric['category'],
	fn: () => T,
	metadata?: Record<string, any>
): T {
	startMetric(name, category, metadata);
	try {
		const result = fn();
		endMetric(name, category);
		return result;
	} catch (error) {
		endMetric(name, category, { error: error instanceof Error ? error.message : String(error) });
		throw error;
	}
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Start a new metric collection session
 * Useful for tracking entire user workflows (e.g., "dataset switch session")
 */
export function startSession(sessionId: string): MetricSession {
	const session: MetricSession = {
		sessionId,
		startTime: performance.now(),
		metrics: []
	};

	currentSession = session;

	if (config.logToConsole) {
		console.log(`[Metrics] 📊 Started session: ${sessionId}`);
	}

	return session;
}

/**
 * End the current session
 */
export function endSession(): MetricSession | null {
	if (!currentSession) return null;

	const endTime = performance.now();
	currentSession.endTime = endTime;
	currentSession.totalDuration = endTime - currentSession.startTime;

	const session = currentSession;
	currentSession = null;

	if (config.logToConsole) {
		console.log(
			`[Metrics] 📊 Ended session: ${session.sessionId} - ${session.totalDuration?.toFixed(2)}ms`,
			{
				metricsCount: session.metrics.length,
				breakdown: getSessionBreakdown(session)
			}
		);
	}

	return session;
}

/**
 * Get breakdown of session metrics by category
 */
function getSessionBreakdown(session: MetricSession): Record<string, number> {
	const breakdown: Record<string, number> = {};

	for (const metric of session.metrics) {
		if (!breakdown[metric.category]) {
			breakdown[metric.category] = 0;
		}
		breakdown[metric.category] += metric.duration || 0;
	}

	return breakdown;
}

// ============================================
// AGGREGATION & ANALYSIS
// ============================================

/**
 * Get aggregated statistics for a specific metric name
 */
export function getAggregatedMetrics(
	name: string,
	category?: PerformanceMetric['category']
): AggregatedMetrics | null {
	const filtered = completedMetrics.filter(
		(m) => m.name === name && (!category || m.category === category) && m.duration !== undefined
	);

	if (filtered.length === 0) return null;

	const durations = filtered.map((m) => m.duration!).sort((a, b) => a - b);

	return {
		count: durations.length,
		min: Math.min(...durations),
		max: Math.max(...durations),
		avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
		p50: durations[Math.floor(durations.length * 0.5)],
		p95: durations[Math.floor(durations.length * 0.95)],
		p99: durations[Math.floor(durations.length * 0.99)],
		last: durations[durations.length - 1]
	};
}

/**
 * Get all metrics for a category
 */
export function getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
	return completedMetrics.filter((m) => m.category === category);
}

/**
 * Get recent metrics (last N)
 */
export function getRecentMetrics(count: number = 10): PerformanceMetric[] {
	return completedMetrics.slice(-count);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Clear all metrics
 */
export function clearMetrics(): void {
	completedMetrics.length = 0;
	activeTimers.clear();
	currentSession = null;
	console.log('[Metrics] 🧹 Cleared all metrics');
}

/**
 * Export metrics as JSON
 */
export function exportMetrics(): string {
	return JSON.stringify(
		{
			metrics: completedMetrics,
			timestamp: Date.now(),
			config
		},
		null,
		2
	);
}

/**
 * Get current configuration
 */
export function getConfig() {
	return { ...config };
}

/**
 * Update configuration
 */
export function updateConfig(updates: Partial<typeof config>): void {
	Object.assign(config, updates);
}

// ============================================
// REACTIVE GETTERS (for Svelte components)
// ============================================

/**
 * Get all metrics (reactive)
 */
export function getAllMetrics(): PerformanceMetric[] {
	return completedMetrics;
}

/**
 * Get current session (reactive)
 */
export function getCurrentSession(): MetricSession | null {
	return currentSession;
}

/**
 * Get metrics count (reactive)
 */
export function getMetricsCount(): number {
	return completedMetrics.length;
}

// ============================================
// DEBUG HELPERS
// ============================================

if (typeof window !== 'undefined') {
	// @ts-ignore - for debugging
	window.__performanceMetrics = {
		startMetric,
		endMetric,
		timeAsync,
		timeSync,
		startSession,
		endSession,
		getAggregatedMetrics,
		getMetricsByCategory,
		getRecentMetrics,
		clearMetrics,
		exportMetrics,
		getAllMetrics,
		getCurrentSession,
		getConfig,
		updateConfig
	};

	console.log('[Metrics] 📊 Performance metrics system initialized');
	console.log('[Metrics] 💡 Access via window.__performanceMetrics');
}
