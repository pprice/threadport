import { useViewportSelector } from './useViewportSelector'

/**
 * Subscribe to the active Viewport's one-shot {@link ViewportState.isReady}
 * signal.
 *
 * Returns `false` until the first settled-state emission (after initial
 * paint and row measurements), then `true` for the lifetime of the Viewport.
 * Special case: a Viewport that mounts with `items.length === 0` reports
 * `true` immediately.
 *
 * Use this to gate first-paint UI: fade in a transcript once measurements
 * settle, hide a scrollbar until layout stabilizes, defer animation classes
 * until rows have measured. Saves you from inventing your own
 * settling-detection heuristic.
 *
 * Must be called inside a `<ThreadPort.Root>` containing a
 * `<ThreadPort.Viewport>` — same scoping as {@link useViewportSelector}.
 *
 * @example
 * function TranscriptShell() {
 *   const ready = ThreadPort.useViewportReady()
 *   return (
 *     <div className={ready ? 'transcript transcript-ready' : 'transcript'}>
 *       <ThreadPort.Viewport ... />
 *     </div>
 *   )
 * }
 */
export function useViewportReady(): boolean {
  return useViewportSelector(selectIsReady)
}

function selectIsReady(state: { isReady: boolean }) {
  return state.isReady
}
