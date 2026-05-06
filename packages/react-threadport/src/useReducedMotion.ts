import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function getSnapshot() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia(QUERY).matches
}

function getServerSnapshot() {
  return false
}

function subscribe(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const media = window.matchMedia(QUERY)
  media.addEventListener('change', listener)

  return () => {
    media.removeEventListener('change', listener)
  }
}

/**
 * Subscribe to the user's `prefers-reduced-motion` preference.
 *
 * Returns `true` when the OS-level reduced-motion setting is on, `false`
 * otherwise. Re-renders the calling component when the preference changes
 * (e.g. user toggles macOS "Reduce motion" mid-session).
 *
 * **You usually don't need this for scroll animations** — Threadport's
 * imperative scroll commands already auto-respect reduced motion via
 * {@link ScrollAnimation.respectReducedMotion} (default `true`). Use this
 * hook for *host-level* motion decisions: composer streaming pacing, message
 * enter animations, decorative transitions, etc.
 *
 * SSR-safe: returns `false` during server rendering.
 *
 * @example
 * function MessageRow({ body }: { body: string }) {
 *   const reducedMotion = ThreadPort.useReducedMotion()
 *   return (
 *     <article style={{
 *       animation: reducedMotion ? 'none' : 'message-enter 280ms ease-out',
 *     }}>
 *       {body}
 *     </article>
 *   )
 * }
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
