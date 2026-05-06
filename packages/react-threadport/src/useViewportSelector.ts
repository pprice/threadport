import { useContext, useRef, useSyncExternalStore } from 'react'
import { RootContext } from './internal/rootContext'
import type { ViewportState } from './types'

/**
 * Subscribe to a slice of the active Viewport's state.
 *
 * Must be called from a component rendered inside a `<ThreadPort.Root>`.
 * Re-renders the calling component only when the slice returned by
 * `selector` changes (compared with `equalityFn`, which defaults to
 * `Object.is`).
 *
 * Use this in sibling chrome — composer dock, jump-to-bottom button,
 * unread-counter badge — that needs to react to scroll state without
 * re-rendering on every frame.
 *
 * Until the Viewport's first state emit lands, the selector receives a
 * synthetic initial state (all numbers 0, `isReady: false`, etc.), so the
 * hook is safe to call on the first render even before any effects have
 * run. Once Viewport emits, subscribers re-render with the real values.
 *
 * For non-React or non-descendant access, use the imperative escape hatch:
 * `viewportRef.current?.getState()`.
 *
 * @throws if called outside a `<ThreadPort.Root>`.
 *
 * @example
 * function JumpButton() {
 *   const showJump = ThreadPort.useViewportSelector(
 *     (state) => state.distanceFromTail > 200,
 *   )
 *   if (!showJump) return null
 *   return <button onClick={...}>Jump to bottom</button>
 * }
 */
export function useViewportSelector<T>(
  selector: (state: ViewportState) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
): T {
  const root = useContext(RootContext)

  if (!root) {
    throw new Error(
      '[threadport] useViewportSelector must be called inside a <ThreadPort.Root>',
    )
  }

  const { viewportStore } = root
  const lastResultRef = useRef<{ state: ViewportState; value: T } | null>(null)

  function getSelected(): T {
    const state = viewportStore.getSnapshot()
    const cached = lastResultRef.current

    if (cached && cached.state === state) {
      return cached.value
    }

    const next = selector(state)

    if (cached && equalityFn(cached.value, next)) {
      lastResultRef.current = { state, value: cached.value }
      return cached.value
    }

    lastResultRef.current = { state, value: next }
    return next
  }

  function getServerSelected(): T {
    return selector(viewportStore.getServerSnapshot())
  }

  return useSyncExternalStore(
    viewportStore.subscribe,
    getSelected,
    getServerSelected,
  )
}
