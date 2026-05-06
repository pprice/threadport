import { easeOutQuartCurve, type ScrollAnimation } from '../easing'
import type { ScrollResult } from '../types'
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

type ResolvedScrollAnimation = {
  duration: number
  easing: (t: number) => number
  respectReducedMotion: boolean
}

export function resolveScrollAnimation(
  animation?: ScrollAnimation,
  defaultAnimation?: ScrollAnimation,
): ResolvedScrollAnimation {
  return {
    duration:
      animation?.duration ??
      defaultAnimation?.duration ??
      DEFAULT_SCROLL_DURATION,
    easing: animation?.easing ?? defaultAnimation?.easing ?? easeOutQuartCurve,
    respectReducedMotion:
      animation?.respectReducedMotion ??
      defaultAnimation?.respectReducedMotion ??
      true,
  }
}

export function animateScrollTop(
  element: HTMLElement,
  getTargetTop: () => number,
  animation: ResolvedScrollAnimation,
  onDone: (result: ScrollResult) => void,
): ActiveScrollAnimation {
  const { duration, easing, respectReducedMotion } = animation
  const startTop = element.scrollTop

  function readTargetTop() {
    const maxTop = Math.max(0, element.scrollHeight - element.clientHeight)

    return clamp(getTargetTop(), 0, maxTop)
  }

  const initialTarget = readTargetTop()
  const isInstant =
    duration <= 0 ||
    Math.abs(initialTarget - startTop) < 1 ||
    (respectReducedMotion && prefersReducedMotion())

  if (isInstant) {
    element.scrollTop = initialTarget
    onDone('completed')

    return { cancel: () => undefined }
  }

  let animationFrame = 0
  let cancelled = false
  let finished = false
  const startTime = performance.now()
  const cancelEvents = [
    'wheel',
    'touchstart',
    'pointerdown',
    'keydown',
  ] as const

  function cleanup() {
    cancelEvents.forEach((eventName) => {
      element.removeEventListener(eventName, cancel)
    })
  }

  function finish(result: ScrollResult) {
    if (finished) {
      return
    }

    finished = true
    cancelAnimationFrame(animationFrame)
    cleanup()
    onDone(result)
  }

  function cancel() {
    if (cancelled) {
      return
    }

    cancelled = true
    finish('cancelled')
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
    finish('completed')
  }

  cancelEvents.forEach((eventName) => {
    element.addEventListener(eventName, cancel, { passive: true })
  })

  animationFrame = requestAnimationFrame(frame)

  return { cancel }
}
