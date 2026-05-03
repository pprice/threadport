export type ChatScrollEasing = (t: number) => number

export type ChatScrollAnimation = {
  duration?: number
  easing?: ChatScrollEasing
}

const DEFAULT_ANIMATION_DURATION = 460

function createAnimation(
  easing: ChatScrollEasing,
  duration = DEFAULT_ANIMATION_DURATION,
): ChatScrollAnimation {
  return { duration, easing }
}

export function linearCurve(t: number) {
  return t
}

export function easeOutQuadCurve(t: number) {
  return 1 - Math.pow(1 - t, 2)
}

export function easeOutCubicCurve(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export function easeOutQuartCurve(t: number) {
  return 1 - Math.pow(1 - t, 4)
}

export function easeOutQuintCurve(t: number) {
  return 1 - Math.pow(1 - t, 5)
}

export function easeInOutCubicCurve(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function linear(duration?: number) {
  return createAnimation(linearCurve, duration)
}

export function easeOutQuad(duration?: number) {
  return createAnimation(easeOutQuadCurve, duration)
}

export function easeOutCubic(duration?: number) {
  return createAnimation(easeOutCubicCurve, duration)
}

export function easeOutQuart(duration?: number) {
  return createAnimation(easeOutQuartCurve, duration)
}

export function easeOutQuint(duration?: number) {
  return createAnimation(easeOutQuintCurve, duration)
}

export function easeInOutCubic(duration?: number) {
  return createAnimation(easeInOutCubicCurve, duration)
}
