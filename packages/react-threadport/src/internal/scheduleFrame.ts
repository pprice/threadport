const SUPPORTS_RAF = typeof requestAnimationFrame !== 'undefined'

function noop() {}

/**
 * Run `callback` after one animation frame. Returns a cancel function.
 * Falls back to synchronous execution when rAF is unavailable (SSR, tests).
 */
export function nextFrame(callback: () => void): () => void {
  if (!SUPPORTS_RAF) {
    callback()
    return noop
  }

  const id = requestAnimationFrame(callback)
  return () => cancelAnimationFrame(id)
}

/**
 * Run `callback` after two animation frames — i.e. after the next paint has
 * fully settled. Useful for "read final layout after a write" patterns.
 * Returns a cancel function.
 */
export function afterTwoFrames(callback: () => void): () => void {
  if (!SUPPORTS_RAF) {
    callback()
    return noop
  }

  let id = requestAnimationFrame(() => {
    id = requestAnimationFrame(callback)
  })

  return () => cancelAnimationFrame(id)
}

export type FrameThrottle = {
  call: () => void
  cancel: () => void
}

/**
 * Leading-edge throttle: invokes `callback` immediately on the first call,
 * then ignores subsequent calls until the next animation frame.
 *
 * Use for high-frequency events (scroll, mousemove) where you want immediate
 * feedback but at most one invocation per frame.
 */
export function createFrameThrottle(callback: () => void): FrameThrottle {
  if (!SUPPORTS_RAF) {
    return { call: callback, cancel: noop }
  }

  let frameId: number | null = null

  function release() {
    frameId = null
  }

  return {
    call() {
      if (frameId !== null) {
        return
      }

      callback()
      frameId = requestAnimationFrame(release)
    },
    cancel() {
      if (frameId === null) {
        return
      }

      cancelAnimationFrame(frameId)
      frameId = null
    },
  }
}

export type FrameScheduler = {
  request: () => void
  cancel: () => void
}

/**
 * Trailing-edge debouncer: schedules `callback` for the next animation frame.
 * Repeated `request()` calls before that frame fires are coalesced into one
 * invocation.
 *
 * Use for state changes that should be batched per frame.
 */
export function createFrameDebouncer(callback: () => void): FrameScheduler {
  if (!SUPPORTS_RAF) {
    return { request: callback, cancel: noop }
  }

  let frameId: number | null = null

  return {
    request() {
      if (frameId !== null) {
        return
      }

      frameId = requestAnimationFrame(() => {
        frameId = null
        callback()
      })
    },
    cancel() {
      if (frameId === null) {
        return
      }

      cancelAnimationFrame(frameId)
      frameId = null
    },
  }
}

/**
 * Trailing-edge double-rAF scheduler: invokes `callback` after two animation
 * frames have elapsed. Coalesces repeated `request()` calls during that
 * window into one invocation.
 *
 * Use for "wait until the layout has fully settled" semantics, where a
 * single rAF is too eager (the next paint hasn't committed yet).
 */
export function createSettledFrameScheduler(
  callback: () => void,
): FrameScheduler {
  if (!SUPPORTS_RAF) {
    return { request: callback, cancel: noop }
  }

  let frameId: number | null = null

  return {
    request() {
      if (frameId !== null) {
        return
      }

      frameId = requestAnimationFrame(() => {
        frameId = requestAnimationFrame(() => {
          frameId = null
          callback()
        })
      })
    },
    cancel() {
      if (frameId === null) {
        return
      }

      cancelAnimationFrame(frameId)
      frameId = null
    },
  }
}
