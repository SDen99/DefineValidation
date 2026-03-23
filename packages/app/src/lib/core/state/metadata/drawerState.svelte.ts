/**
 * Edit Drawer State Module
 *
 * Manages the bottom drawer UI state for inline metadata editing.
 * Handles drawer open/close, active item tracking, and resize state.
 */

import type { DefineType, ItemType } from './editState.svelte';

// Active item being edited in the drawer
export interface DrawerActiveItem {
	oid: string;
	itemType: ItemType;
	defineType: DefineType;
}

// Drawer state class
export class DrawerState {
	isOpen = $state(false);
	activeItem = $state<DrawerActiveItem | null>(null);
	pendingItem = $state<DrawerActiveItem | null>(null); // Item waiting for confirmation
	height = $state(400); // Default drawer height in pixels
	minHeight = 200;
	maxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.5 : 450; // Max 50% of viewport

	// Open drawer with an item
	open(item: DrawerActiveItem) {
		// Check if we're already editing an item
		if (this.isOpen && this.activeItem && !this.isSameItem(item, this.activeItem)) {
			// Different item - store as pending and show confirmation
			this.pendingItem = item;
			return;
		}

		// Open the item
		this.activeItem = item;
		this.isOpen = true;
		this.pendingItem = null;
	}

	// Close drawer
	close() {
		this.isOpen = false;
		this.pendingItem = null;
		// Don't clear activeItem immediately to allow for smooth transition
		setTimeout(() => {
			this.activeItem = null;
		}, 300); // Match transition duration
	}

	// Confirm switch to pending item
	confirmSwitch() {
		if (this.pendingItem) {
			this.activeItem = this.pendingItem;
			this.pendingItem = null;
			this.isOpen = true;
		}
	}

	// Cancel switch to pending item
	cancelSwitch() {
		this.pendingItem = null;
	}

	// Set drawer height (called during resize)
	setHeight(newHeight: number) {
		// Clamp between min and max
		this.height = Math.max(this.minHeight, Math.min(this.maxHeight, newHeight));
	}

	// Check if a specific item is currently open
	isItemOpen(oid: string, itemType: ItemType, defineType: DefineType): boolean {
		return (
			this.isOpen &&
			this.activeItem?.oid === oid &&
			this.activeItem?.itemType === itemType &&
			this.activeItem?.defineType === defineType
		);
	}

	// Check if two items are the same
	private isSameItem(item1: DrawerActiveItem, item2: DrawerActiveItem): boolean {
		return (
			item1.oid === item2.oid &&
			item1.itemType === item2.itemType &&
			item1.defineType === item2.defineType
		);
	}
}

// Singleton instance
export const drawerState = new DrawerState();
