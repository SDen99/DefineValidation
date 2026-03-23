/**
 * Column Drag and Drop Logic
 *
 * Handles drag-and-drop reordering of table columns.
 */

export interface DragDropState {
	draggedColumnId: string | null;
	dragOverColumnId: string | null;
}

export interface DragDropHandlers {
	handleDragStart: (columnId: string) => void;
	handleDragOver: (columnId: string) => void;
	handleDragLeave: () => void;
	handleDrop: (targetColumnId: string) => void;
	handleDragEnd: () => void;
}

export interface DragDropOptions<T extends { id: string }> {
	getColumns: () => T[];
	setColumns: (columns: T[]) => void;
	getDraggedId: () => string | null;
	setDraggedId: (id: string | null) => void;
	getDragOverId: () => string | null;
	setDragOverId: (id: string | null) => void;
}

/**
 * Create drag-drop handlers for column reordering
 */
export function createDragDropHandlers<T extends { id: string }>(
	options: DragDropOptions<T>
): DragDropHandlers {
	function handleDragStart(columnId: string) {
		options.setDraggedId(columnId);
	}

	function handleDragOver(columnId: string) {
		const draggedId = options.getDraggedId();
		if (draggedId && draggedId !== columnId) {
			options.setDragOverId(columnId);
		}
	}

	function handleDragLeave() {
		options.setDragOverId(null);
	}

	function handleDrop(targetColumnId: string) {
		const draggedId = options.getDraggedId();
		if (draggedId && draggedId !== targetColumnId) {
			const columns = options.getColumns();
			const draggedIndex = columns.findIndex((c) => c.id === draggedId);
			const targetIndex = columns.findIndex((c) => c.id === targetColumnId);

			if (draggedIndex !== -1 && targetIndex !== -1) {
				const newColumns = [...columns];
				const [draggedColumn] = newColumns.splice(draggedIndex, 1);
				newColumns.splice(targetIndex, 0, draggedColumn);
				options.setColumns(newColumns);
			}
		}
		options.setDraggedId(null);
		options.setDragOverId(null);
	}

	function handleDragEnd() {
		options.setDraggedId(null);
		options.setDragOverId(null);
	}

	return {
		handleDragStart,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		handleDragEnd
	};
}

/**
 * Handle DragEvent wrapper - prevents drag on certain elements
 */
export function createDragEventHandler(
	handlers: DragDropHandlers,
	columnId: string
): {
	onDragStart: (e: DragEvent) => void;
	onDragOver: (e: DragEvent) => void;
	onDragLeave: () => void;
	onDrop: (e: DragEvent) => void;
	onDragEnd: () => void;
} {
	return {
		onDragStart: (e: DragEvent) => {
			const target = e.target as HTMLElement;
			// Prevent drag from starting on resize handle or dropdown
			if (target.closest('[role="separator"]') || target.closest('.chart-mode-trigger')) {
				e.preventDefault();
				return;
			}

			handlers.handleDragStart(columnId);
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', columnId);
			}
		},
		onDragOver: (e: DragEvent) => {
			e.preventDefault();
			handlers.handleDragOver(columnId);
		},
		onDragLeave: handlers.handleDragLeave,
		onDrop: (e: DragEvent) => {
			e.preventDefault();
			handlers.handleDrop(columnId);
		},
		onDragEnd: handlers.handleDragEnd
	};
}
