export type ScrollEasing = (t: number) => number

export type ScrollAnimation = {
  duration?: number
  easing?: ScrollEasing
}

const DEFAULT_ANIMATION_DURATION = 460

function createAnimation(
  easing: ScrollEasing,
  duration = DEFAULT_ANIMATION_DURATION,
): ScrollAnimation {
  return { duration, easing }
}

export function linearCurve(t: number) {
  return t
}

export function easeOutQuadCurve(t: number) {
  return 1 - (1 - t) ** 2
}

export function easeOutCubicCurve(t: number) {
  return 1 - (1 - t) ** 3
}

export function easeOutQuartCurve(t: number) {
  return 1 - (1 - t) ** 4
}

export function easeOutQuintCurve(t: number) {
  return 1 - (1 - t) ** 5
}

export function easeInOutCubicCurve(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function linear(duration?: number) {
  return createAnimation(linearCurve, duration)
}

function easeOutQuad(duration?: number) {
  return createAnimation(easeOutQuadCurve, duration)
}

function easeOutCubic(duration?: number) {
  return createAnimation(easeOutCubicCurve, duration)
}

function easeOutQuart(duration?: number) {
  return createAnimation(easeOutQuartCurve, duration)
}

function easeOutQuint(duration?: number) {
  return createAnimation(easeOutQuintCurve, duration)
}

function easeInOutCubic(duration?: number) {
  return createAnimation(easeInOutCubicCurve, duration)
}

export const Animation = {
  easeInOutCubic,
  easeOutCubic,
  easeOutQuad,
  easeOutQuart,
  easeOutQuint,
  linear,
} as const
