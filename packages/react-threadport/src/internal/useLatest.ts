import { useRef } from 'react'

/**
 * Keeps a ref pointed at the latest value rendered. Useful for stable
 * callbacks that need to read state captured by an unstable render-phase
 * closure without re-running effects on every change.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  ref.current = value
  return ref
}
