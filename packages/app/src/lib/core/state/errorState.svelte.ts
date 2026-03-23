// lib/core/state/errorState.svelte.ts
// Global error handling state management

// ============================================
// TYPES
// ============================================

export enum ErrorSeverity {
	INFO = 'info',
	WARNING = 'warning',
	ERROR = 'error',
	CRITICAL = 'critical'
}

export interface ErrorEntry {
	id: string;
	message: string;
	severity: ErrorSeverity;
	timestamp: number;
	context?: Record<string, any>;
	stack?: string;
	dismissed?: boolean;
}

// ============================================
// EXPORTED STATE
// ============================================

// Active errors
export const errors = $state<ErrorEntry[]>([]);

// Error history (including dismissed)
export const errorHistory = $state<ErrorEntry[]>([]);

// Global error count by severity
export const errorCounts = $state<Record<ErrorSeverity, number>>({
	[ErrorSeverity.INFO]: 0,
	[ErrorSeverity.WARNING]: 0,
	[ErrorSeverity.ERROR]: 0,
	[ErrorSeverity.CRITICAL]: 0
});

// ============================================
// ERROR ACTIONS
// ============================================

export function addError(error: {
	message: string;
	severity?: ErrorSeverity;
	context?: Record<string, any>;
	stack?: string;
}) {
	const errorEntry: ErrorEntry = {
		id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		message: error.message,
		severity: error.severity || ErrorSeverity.ERROR,
		timestamp: Date.now(),
		context: error.context,
		stack: error.stack,
		dismissed: false
	};

	// Add to active errors
	errors.push(errorEntry);

	// Add to history
	errorHistory.push(errorEntry);

	// Update counts
	errorCounts[errorEntry.severity]++;

	// Auto-dismiss info messages after 5 seconds
	if (errorEntry.severity === ErrorSeverity.INFO) {
		setTimeout(() => dismissError(errorEntry.id), 5000);
	}

	return errorEntry.id;
}

export function dismissError(errorId: string) {
	const index = errors.findIndex((e) => e.id === errorId);
	if (index >= 0) {
		const error = errors[index];
		error.dismissed = true;
		errors.splice(index, 1);
	}

	// Mark as dismissed in history
	const historyEntry = errorHistory.find((e) => e.id === errorId);
	if (historyEntry) {
		historyEntry.dismissed = true;
	}
}

export function dismissAllErrors() {
	errors.forEach((error) => {
		error.dismissed = true;
	});
	errors.length = 0;
}

export function clearErrorHistory() {
	errorHistory.length = 0;
	errors.length = 0;

	// Reset counts
	Object.keys(errorCounts).forEach((key) => {
		errorCounts[key as ErrorSeverity] = 0;
	});
}

// ============================================
// ERROR UTILITIES
// ============================================

export function logError(error: Error | unknown, context?: Record<string, any>) {
	if (error instanceof Error) {
		addError({
			message: error.message,
			severity: ErrorSeverity.ERROR,
			context,
			stack: error.stack
		});
	} else {
		addError({
			message: String(error),
			severity: ErrorSeverity.ERROR,
			context
		});
	}
}

export function logWarning(message: string, context?: Record<string, any>) {
	addError({
		message,
		severity: ErrorSeverity.WARNING,
		context
	});
}

export function logInfo(message: string, context?: Record<string, any>) {
	addError({
		message,
		severity: ErrorSeverity.INFO,
		context
	});
}

export function logCritical(message: string, context?: Record<string, any>) {
	addError({
		message,
		severity: ErrorSeverity.CRITICAL,
		context
	});
}

// ============================================
// ERROR QUERIES
// ============================================

export function getActiveErrors(): ErrorEntry[] {
	return errors.filter((e) => !e.dismissed);
}

export function getErrorsBySeverity(severity: ErrorSeverity): ErrorEntry[] {
	return errors.filter((e) => e.severity === severity && !e.dismissed);
}

export function hasErrors(): boolean {
	return errors.length > 0;
}

export function hasCriticalErrors(): boolean {
	return errors.some((e) => e.severity === ErrorSeverity.CRITICAL && !e.dismissed);
}

export function getErrorCount(severity?: ErrorSeverity): number {
	if (severity) {
		return errors.filter((e) => e.severity === severity && !e.dismissed).length;
	}
	return errors.filter((e) => !e.dismissed).length;
}

export function getLatestError(): ErrorEntry | null {
	return errors[errors.length - 1] || null;
}

// ============================================
// ERROR FORMATTING
// ============================================

export function formatError(error: ErrorEntry): string {
	const time = new Date(error.timestamp).toLocaleTimeString();
	const severityEmoji = {
		[ErrorSeverity.INFO]: 'ℹ️',
		[ErrorSeverity.WARNING]: '⚠️',
		[ErrorSeverity.ERROR]: '❌',
		[ErrorSeverity.CRITICAL]: '🔴'
	};

	return `${severityEmoji[error.severity]} [${time}] ${error.message}`;
}

export function getErrorSummary(): string {
	const critical = errorCounts[ErrorSeverity.CRITICAL];
	const errors = errorCounts[ErrorSeverity.ERROR];
	const warnings = errorCounts[ErrorSeverity.WARNING];

	const parts = [];
	if (critical > 0) parts.push(`${critical} critical`);
	if (errors > 0) parts.push(`${errors} errors`);
	if (warnings > 0) parts.push(`${warnings} warnings`);

	return parts.join(', ') || 'No errors';
}

// ============================================
// STATE PERSISTENCE
// ============================================

export function getErrorStateSnapshot() {
	return {
		errors: errors.map((e) => ({ ...e })),
		errorHistory: errorHistory.slice(-100), // Keep last 100 for history
		errorCounts: { ...errorCounts }
	};
}

export function restoreErrorState(state: {
	errors?: ErrorEntry[];
	errorHistory?: ErrorEntry[];
	errorCounts?: Record<ErrorSeverity, number>;
}) {
	if (state.errors) {
		errors.length = 0;
		errors.push(...state.errors);
	}

	if (state.errorHistory) {
		errorHistory.length = 0;
		errorHistory.push(...state.errorHistory);
	}

	if (state.errorCounts) {
		Object.assign(errorCounts, state.errorCounts);
	}
}

// ============================================
// DEBUG HELPERS (for development only)
// ============================================

if (typeof window !== 'undefined') {
	// @ts-ignore - for debugging
	window.__errorState = {
		errors,
		errorHistory,
		errorCounts,
		// Helper functions
		getErrorSummary,
		hasCriticalErrors,
		getActiveErrors
	};
}
