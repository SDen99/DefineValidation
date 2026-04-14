// packages/app/src/lib/core/services/validation.worker.ts
//
// Web Worker that runs validation engine off the main thread.
// Receives dataset rows + pre-generated rules, returns validation results.

import { validate, type Rule, type ValidationResult, type ValidationEngineError } from '@sden99/validation-engine';

export interface ValidateRequest {
	type: 'VALIDATE';
	id: number;
	payload: {
		datasetId: string;
		data: Record<string, unknown>[];
		rules: Rule[];
		domain: string;
	};
}

export interface ValidateResponse {
	type: 'VALIDATE_RESULT';
	id: number;
	payload: {
		datasetId: string;
		results: SerializedValidationResult[];
		errors: ValidationEngineError[];
	};
}

/** ValidationResult with Maps converted to plain objects for serialization */
export interface SerializedValidationResult {
	ruleId: string;
	columnId: string;
	severity: 'error' | 'warning' | 'info';
	issueCount: number;
	affectedRows: number[];
	message: string;
	details?: {
		invalidValues?: Record<string, number>;
		rule?: Rule;
	};
}

function serializeResult(result: ValidationResult): SerializedValidationResult {
	const serialized: SerializedValidationResult = {
		ruleId: result.ruleId,
		columnId: result.columnId,
		severity: result.severity,
		issueCount: result.issueCount,
		affectedRows: result.affectedRows,
		message: result.message
	};

	if (result.details) {
		serialized.details = {
			rule: result.details.rule
		};
		if (result.details.invalidValues) {
			const obj: Record<string, number> = {};
			for (const [key, val] of result.details.invalidValues) {
				obj[key] = val;
			}
			serialized.details.invalidValues = obj;
		}
	}

	return serialized;
}

self.onmessage = (e: MessageEvent<ValidateRequest>) => {
	const { type, id, payload } = e.data;

	if (type === 'VALIDATE') {
		const { datasetId, data, rules, domain } = payload;
		const errors: ValidationEngineError[] = [];

		try {
			const results = validate(data, rules, domain, errors);
			const serialized = results.map(serializeResult);

			(self as unknown as Worker).postMessage({
				type: 'VALIDATE_RESULT',
				id,
				payload: { datasetId, results: serialized, errors }
			} satisfies ValidateResponse);
		} catch (error) {
			(self as unknown as Worker).postMessage({
				type: 'VALIDATE_RESULT',
				id,
				payload: {
					datasetId,
					results: [],
					errors: [{
						ruleId: 'WORKER_ERROR',
						message: error instanceof Error ? error.message : String(error),
						type: 'execution'
					} as ValidationEngineError, ...errors]
				}
			} satisfies ValidateResponse);
		}
	}
};
