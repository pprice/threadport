import type { ScrollResult } from '../types'

/**
 * Wraps an imperative scroll command into a `Promise<ScrollResult>`. The
 * `start` callback runs the scroll synchronously; it returns whether the
 * scroll started (false → element unavailable, etc.) and is responsible for
 * invoking `onSettled` when the animation lands or is interrupted.
 */
export function scrollAsPromise(
  start: (onSettled: (result: ScrollResult) => void) => boolean,
): Promise<ScrollResult> {
  return new Promise((resolve) => {
    const ok = start(resolve)

    if (!ok) {
      resolve('rejected')
    }
  })
}
