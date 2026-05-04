export type FrameThrottle = {
  call: () => void
  cancel: () => void
}

function noop() {}

export function createFrameThrottle(callback: () => void): FrameThrottle {
  if (typeof requestAnimationFrame === 'undefined') {
    return { call: callback, cancel: noop }
  }

  let frameId: number | null = null

  function release() {
    frameId = null
  }

  function call() {
    if (frameId !== null) {
      return
    }

    callback()
    frameId = requestAnimationFrame(release)
  }

  function cancel() {
    if (frameId === null) {
      return
    }

    cancelAnimationFrame(frameId)
    frameId = null
  }

  return { call, cancel }
}
