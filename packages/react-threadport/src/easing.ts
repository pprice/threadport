/**
 * Easing function: takes normalized time `t` in `[0, 1]` and returns
 * normalized progress in `[0, 1]` (typically). Custom easings can
 * undershoot or overshoot for elastic effects, but the built-in
 * {@link Animation} curves all stay within `[0, 1]`.
 *
 * @param t Normalized time, 0 (start) to 1 (end).
 * @returns Normalized progress at that time.
 */
export type ScrollEasing = (t: number) => number

/**
 * Animation timing for an imperative scroll command.
 *
 * Pass `{ duration: 0 }` to skip animation entirely (useful for tests and
 * `prefers-reduced-motion` paths). Use {@link Animation} factories for
 * convenient curve + duration pairs.
 */
export type ScrollAnimation = {
  /** Duration in milliseconds. Defaults to 460. */
  duration?: number
  /** Easing curve. Defaults to ease-out-quart. */
  easing?: ScrollEasing
}

const DEFAULT_ANIMATION_DURATION = 460

function createAnimation(
  easing: ScrollEasing,
  duration = DEFAULT_ANIMATION_DURATION,
): ScrollAnimation {
  return { duration, easing }
}

/** Linear curve (constant velocity). Rarely flattering for scroll. */
export function linearCurve(t: number) {
  return t
}

/** Quadratic ease-out: `1 - (1 - t)^2`. Gentlest decelerating curve. */
export function easeOutQuadCurve(t: number) {
  return 1 - (1 - t) ** 2
}

/** Cubic ease-out: `1 - (1 - t)^3`. Slow landing. */
export function easeOutCubicCurve(t: number) {
  return 1 - (1 - t) ** 3
}

/** Quartic ease-out: `1 - (1 - t)^4`. Balanced snap; the library default. */
export function easeOutQuartCurve(t: number) {
  return 1 - (1 - t) ** 4
}

/** Quintic ease-out: `1 - (1 - t)^5`. Tightest landing; feels decisive. */
export function easeOutQuintCurve(t: number) {
  return 1 - (1 - t) ** 5
}

/** Cubic ease-in-out: smooth S-curve, accelerates in and decelerates out. */
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

/**
 * Factory for {@link ScrollAnimation} objects with curated easing curves.
 *
 * All non-linear curves "ease out" (decelerate near the end), which is the
 * right shape for chat-style scroll snaps where the user expects landing
 * precision over acceleration drama. Higher orders (Quart, Quint) feel
 * snappier; lower orders (Quad, Cubic) feel slower into the landing.
 *
 * Each factory takes an optional `duration` in milliseconds and returns a
 * `ScrollAnimation` ready to pass into any imperative scroll command.
 *
 * @example
 * viewportRef.current?.scrollToItem(messageId, {
 *   align: 'head',
 *   animation: ThreadPort.Animation.easeOutQuart(420),
 * })
 *
 * @example
 * // Reduced-motion fallback:
 * const animation = reducedMotion
 *   ? { duration: 0 }
 *   : ThreadPort.Animation.easeOutCubic(360)
 */
export const Animation = {
  /**
   * Smooth S-curve, accelerating in and decelerating out. Use for
   * centered scrolls or "settle to position" motions where both ends of
   * the curve should feel deliberate.
   */
  easeInOutCubic,
  /** Cubic ease-out. Slowest landing of the eased curves. */
  easeOutCubic,
  /** Quadratic ease-out. The gentlest decelerating curve. */
  easeOutQuad,
  /** Quartic ease-out. The library's default cadence; balanced snap. */
  easeOutQuart,
  /** Quintic ease-out. The tightest landing; feels decisive and fast. */
  easeOutQuint,
  /** Linear (no easing). Constant velocity; rarely flattering for scroll. */
  linear,
} as const
