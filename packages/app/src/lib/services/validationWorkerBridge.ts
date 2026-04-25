/**
 * Validation Worker Bridge
 *
 * Handles Web Worker lifecycle, message serialization, and request/response
 * routing for the validation worker. Keeps the main thread responsive by
 * offloading row-level validation to a worker.
 */

import type { Rule, ValidationResult, ValidationEngineError } from '@sden99/validation-engine';
import { validate } from '@sden99/validation-engine';
import { browser } from '$app/environment';
import type { SerializedValidationResult, ValidateResponse } from '$lib/core/services/validation.worker';
import ValidationWorker from '$lib/core/services/validation.worker?worker';
import { logWarning } from '$lib/core/state/errorState.svelte';

// Worker instance (lazy-initialized)
let worker: Worker | null = null;
let requestId = 0;
let pendingRequests = new Map<number, {
	datasetId: string;
	resolve: (result: { results: ValidationResult[]; errors: ValidationEngineError[] }) => void;
}>();

function getWorker(): Worker | null {
	if (!browser) return null;
	if (!worker) {
		try {
			worker = new ValidationWorker();
			worker.onmessage = handleWorkerMessage;
			worker.onerror = (err) => {
				console.error('[ValidationWorkerBridge] Worker error:', err);
				logWarning('Validation worker error — results may be incomplete');
			};
		} catch (e) {
			console.error('[ValidationWorkerBridge] Failed to create worker:', e);
			return null;
		}
	}
	return worker;
}

function handleWorkerMessage(e: MessageEvent<ValidateResponse>) {
	const { type, id, payload } = e.data;
	if (type !== 'VALIDATE_RESULT') return;

	const pending = pendingRequests.get(id);
	if (!pending) return;
	pendingRequests.delete(id);

	const results: ValidationResult[] = payload.results.map(deserializeResult);
	pending.resolve({ results, errors: payload.errors });
}

function deserializeResult(sr: SerializedValidationResult): ValidationResult {
	const result: ValidationResult = {
		ruleId: sr.ruleId,
		columnId: sr.columnId,
		severity: sr.severity,
		issueCount: sr.issueCount,
		affectedRows: sr.affectedRows,
		message: sr.message
	};
	if (sr.details) {
		result.details = { rule: sr.details.rule };
		if (sr.details.invalidValues) {
			result.details.invalidValues = new Map(Object.entries(sr.details.invalidValues).map(
				([k, v]) => [k, v as number]
			));
		}
	}
	return result;
}

/**
 * Send a validation job to the worker.
 * Falls back to synchronous validation if the worker is unavailable.
 */
export function validateViaWorker(
	datasetId: string,
	data: Record<string, unknown>[],
	rules: Rule[],
	domain: string
): Promise<{ results: ValidationResult[]; errors: ValidationEngineError[] }> {
	const w = getWorker();
	if (!w) {
		// Fallback: run synchronously if worker unavailable (SSR or error)
		const errors: ValidationEngineError[] = [];
		const results = validate(data, rules, domain, errors);
		return Promise.resolve({ results, errors });
	}

	const id = ++requestId;
	return new Promise((resolve) => {
		pendingRequests.set(id, { datasetId, resolve });
		w.postMessage({
			type: 'VALIDATE',
			id,
			payload: { datasetId, data, rules, domain }
		});
	});
}

/**
 * Dispose the worker and clear pending requests.
 */
export function disposeWorker(): void {
	if (worker) {
		worker.terminate();
		worker = null;
	}
	pendingRequests.clear();
	requestId = 0;
}
