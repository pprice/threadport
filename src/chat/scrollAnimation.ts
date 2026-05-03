import {
  easeOutQuartCurve,
  type ChatScrollAnimation,
} from './easing'
import { DEFAULT_SCROLL_DURATION } from './constants'

export type ActiveScrollAnimation = {
  cancel: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function resolveScrollAnimation(
  animation?: ChatScrollAnimation,
  defaultAnimation?: ChatScrollAnimation,
): Required<ChatScrollAnimation> {
  return {
    duration:
      animation?.duration ??
      defaultAnimation?.duration ??
      DEFAULT_SCROLL_DURATION,
    easing:
      animation?.easing ??
      defaultAnimation?.easing ??
      easeOutQuartCurve,
  }
}

export function animateScrollTop(
  element: HTMLElement,
  getTargetTop: () => number,
  animation: Required<ChatScrollAnimation>,
  onDone: () => void,
): ActiveScrollAnimation {
  const { duration, easing } = animation
  const startTop = element.scrollTop

  function readTargetTop() {
    const maxTop = Math.max(0, element.scrollHeight - element.clientHeight)

    return clamp(getTargetTop(), 0, maxTop)
  }

  const initialTarget = readTargetTop()

  if (
    duration <= 0 ||
    Math.abs(initialTarget - startTop) < 1 ||
    prefersReducedMotion()
  ) {
    element.scrollTop = initialTarget
    onDone()

    return { cancel: () => undefined }
  }

  let animationFrame = 0
  let cancelled = false
  let finished = false
  const startTime = performance.now()
  const cancelEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

  function cleanup() {
    cancelEvents.forEach((eventName) => {
      element.removeEventListener(eventName, cancelFromUser)
    })
  }

  function finish() {
    if (finished) {
      return
    }

    finished = true
    cancelAnimationFrame(animationFrame)
    cleanup()
    onDone()
  }

  function cancel() {
    if (cancelled) {
      return
    }

    cancelled = true
    finish()
  }

  function cancelFromUser() {
    cancel()
  }

  function frame(now: number) {
    if (cancelled) {
      return
    }

    const progress = clamp((now - startTime) / duration, 0, 1)
    const targetTop = readTargetTop()
    element.scrollTop = startTop + (targetTop - startTop) * easing(progress)

    if (progress < 1) {
      animationFrame = requestAnimationFrame(frame)
      return
    }

    element.scrollTop = readTargetTop()
    finish()
  }

  cancelEvents.forEach((eventName) => {
    element.addEventListener(eventName, cancelFromUser, { passive: true })
  })

  animationFrame = requestAnimationFrame(frame)

  return { cancel }
}
