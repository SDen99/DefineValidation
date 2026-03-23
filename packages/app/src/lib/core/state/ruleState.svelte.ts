/**
 * Rule State
 *
 * Svelte 5 runes-based state for imported validation rules.
 * Rules are imported from YAML/JSON files and persisted to localStorage.
 * They run alongside auto-generated rules during validation.
 */

import type { Rule } from '@sden99/validation-engine';
import { StorageService } from '$lib/core/services/StorageServices';

// =============================================================================
// Module-level State
// =============================================================================

let importedRules = $state<Map<string, Rule>>(new Map());
let importWarnings = $state<string[]>([]);

// =============================================================================
// Storage Key
// =============================================================================

const STORAGE_KEY = 'sas-viewer-imported-rules';

// =============================================================================
// Public API
// =============================================================================

export const ruleState = {
	/** All imported rules as an array */
	get rules(): Rule[] {
		return Array.from(importedRules.values());
	},

	/** Number of imported rules */
	get count(): number {
		return importedRules.size;
	},

	/** Warnings from the last import */
	get warnings(): string[] {
		return importWarnings;
	},

	/**
	 * Add rules to the imported set.
	 * Duplicate rule IDs are overwritten (update semantics).
	 */
	addRules(rules: Rule[], warnings?: string[]): void {
		const newMap = new Map(importedRules);
		for (const rule of rules) {
			newMap.set(rule.Core.Id, rule);
		}
		importedRules = newMap;

		if (warnings && warnings.length > 0) {
			importWarnings = [...importWarnings, ...warnings];
		}

		this.saveToStorage();
	},

	/** Remove a single rule by ID */
	removeRule(ruleId: string): void {
		const newMap = new Map(importedRules);
		newMap.delete(ruleId);
		importedRules = newMap;
		this.saveToStorage();
	},

	/** Get rules that apply to a specific domain */
	getRulesForDomain(domain: string): Rule[] {
		return this.rules.filter((rule) => {
			const scope = rule.Scope;
			if (!scope || !scope.Domains) return true; // No scope = applies to all

			const { Include, Exclude } = scope.Domains;

			if (Exclude && Exclude.includes(domain)) return false;

			if (Include) {
				if (Include.includes('ALL')) return true;
				return Include.includes(domain);
			}

			return true;
		});
	},

	/** Clear all imported rules and warnings */
	clearAll(): void {
		importedRules = new Map();
		importWarnings = [];
		this.saveToStorage();
	},

	/** Clear just the warnings */
	clearWarnings(): void {
		importWarnings = [];
	},

	/** Persist imported rules to localStorage */
	saveToStorage(): void {
		try {
			const rulesArray = this.rules;
			localStorage.setItem(STORAGE_KEY, JSON.stringify(rulesArray));
		} catch (error) {
			console.warn('[ruleState] Failed to save rules to storage:', error);
		}
	},

	/** Restore imported rules from localStorage */
	loadFromStorage(): void {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return;

			const parsed = JSON.parse(stored);
			if (!Array.isArray(parsed)) return;

			const newMap = new Map<string, Rule>();
			for (const rule of parsed) {
				if (rule?.Core?.Id) {
					newMap.set(rule.Core.Id, rule as Rule);
				}
			}
			importedRules = newMap;
			console.log(`[ruleState] Restored ${newMap.size} imported rules from storage`);
		} catch (error) {
			console.warn('[ruleState] Failed to load rules from storage:', error);
		}
	}
};
