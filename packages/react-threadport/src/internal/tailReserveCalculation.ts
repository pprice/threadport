import type { ItemKey, TailReserveOptions } from '../types'

type TailReserveMinHeight = TailReserveOptions['minHeight']

type ResolveTailReserveMinHeightArgs = {
  consumedBeforeTail: number
  headInset: number
  headReserve: number
  minHeight: TailReserveMinHeight | undefined
  tailInset: number
  viewportSize: number
}

type ResolveUnconsumedTailReserveArgs = {
  activeTailReserveKey: ItemKey | null
  contentSize: number
  enabled: boolean
  minHeight: number
}

type ResolveMaxScrollTopArgs = {
  scrollSize: number
  unconsumedTailReserve: number
  viewportSize: number
}

export function resolveTailReserveMinHeight({
  consumedBeforeTail,
  headInset,
  headReserve,
  minHeight,
  tailInset,
  viewportSize,
}: ResolveTailReserveMinHeightArgs) {
  if (typeof minHeight === 'number') {
    return Math.max(0, minHeight)
  }

  if (typeof minHeight === 'function') {
    return Math.max(
      0,
      minHeight({
        headInset,
        headReserve,
        tailInset,
        viewportSize,
      }),
    )
  }

  return Math.max(0, viewportSize - tailInset - headInset - consumedBeforeTail)
}

export function resolveUnconsumedTailReserve({
  activeTailReserveKey,
  contentSize,
  enabled,
  minHeight,
}: ResolveUnconsumedTailReserveArgs) {
  if (!enabled || activeTailReserveKey === null) {
    return 0
  }

  return Math.max(0, minHeight - contentSize)
}

export function resolveMaxScrollTop({
  scrollSize,
  unconsumedTailReserve,
  viewportSize,
}: ResolveMaxScrollTopArgs) {
  return Math.max(0, scrollSize - unconsumedTailReserve - viewportSize)
}
