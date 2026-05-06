import type { ViewportState } from '../types'

export type ViewportStoreListener = () => void

export type ViewportStore = {
  /** React subscription protocol: register a listener, get a tear-down. */
  subscribe: (listener: ViewportStoreListener) => () => void
  /** Current snapshot. Stable identity until {@link emit} is called with a different state. */
  getSnapshot: () => ViewportState
  /**
   * Server snapshot: returns a synthetic "no-op" state. The selector hook
   * uses this only during SSR; client-side hydration will pick up the real
   * snapshot on first paint.
   */
  getServerSnapshot: () => ViewportState
  /** Replace the current snapshot and notify listeners. */
  emit: (state: ViewportState) => void
}

const SSR_STATE: ViewportState = {
  distanceFromHead: 0,
  distanceFromTail: 0,
  isAtHead: true,
  isAtTail: false,
  isReady: false,
  isScrolling: false,
  scrollbarInlineSize: 0,
  scrollOffset: 0,
  scrollSize: 0,
  viewportSize: 0,
  scrollDirection: null,
  totalItems: 0,
  virtualItems: 0,
}

export function createViewportStore(initial: ViewportState): ViewportStore {
  let snapshot = initial
  const listeners = new Set<ViewportStoreListener>()

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot() {
      return snapshot
    },
    getServerSnapshot() {
      return SSR_STATE
    },
    emit(next) {
      if (next === snapshot) {
        return
      }

      snapshot = next
      listeners.forEach((listener) => {
        listener()
      })
    },
  }
}
