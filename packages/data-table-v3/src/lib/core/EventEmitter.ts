/**
 * EventEmitter - Simple pub/sub system for data events
 *
 * NO SVELTE DEPENDENCIES - Pure TypeScript
 *
 * Provides one-way data flow: business logic emits events,
 * UI components subscribe and react.
 */

export type EventHandler<T = any> = (payload: T) => void;
export type Unsubscribe = () => void;

export class EventEmitter<TEvents extends Record<string, any> = Record<string, any>> {
  private listeners: Map<keyof TEvents, Set<EventHandler>> = new Map();

  /**
   * Subscribe to an event
   * @param event Event name
   * @param handler Callback function
   * @returns Unsubscribe function
   */
  on<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.delete(handler);
        // Clean up empty sets
        if (handlers.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers
   * @param event Event name
   * @param payload Event payload
   */
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      // Call each handler in the order they were registered
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for "${String(event)}":`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event, but only fire once
   * @param event Event name
   * @param handler Callback function
   * @returns Unsubscribe function
   */
  once<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe {
    const wrappedHandler: EventHandler<TEvents[K]> = (payload) => {
      unsubscribe();
      handler(payload);
    };

    const unsubscribe = this.on(event, wrappedHandler);
    return unsubscribe;
  }

  /**
   * Remove all listeners for an event, or all events if no event specified
   * @param event Optional event name
   */
  off<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get count of listeners for an event
   * @param event Event name
   * @returns Number of listeners
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    const handlers = this.listeners.get(event);
    return handlers ? handlers.size : 0;
  }

  /**
   * Get all event names that have listeners
   * @returns Array of event names
   */
  eventNames(): Array<keyof TEvents> {
    return Array.from(this.listeners.keys());
  }
}
