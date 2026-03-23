/**
 * Svelte 5 runes type declarations for standalone package
 */

declare function $state<T>(initial: T): T;
declare function $state<T>(): T | undefined;
declare namespace $state {
	function snapshot<T>(state: T): T;
}

declare function $derived<T>(fn: () => T): T;
declare namespace $derived {
	function by<T>(fn: () => T): T;
}

declare function $effect(fn: () => void | (() => void)): void;
declare namespace $effect {
	function pre(fn: () => void | (() => void)): void;
	function root(fn: () => void | (() => void)): () => void;
}

declare function $props<T>(): T;
declare function $bindable<T>(value?: T): T;
declare function $inspect(...values: any[]): void;