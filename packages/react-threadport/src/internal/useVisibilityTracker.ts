import type { VirtualItem } from '@tanstack/react-virtual'
import { type RefObject, useCallback, useEffect, useRef } from 'react'
import type { ItemKey, VisibilityChange, VisibilityOptions } from '../types'
import { useLatest } from './useLatest'

type UseVisibilityTrackerArgs<TItem> = {
  getItemKey: (item: TItem, index: number) => ItemKey
  items: readonly TItem[]
  onVisibilityChange?: (change: VisibilityChange) => void
  scrollRef: RefObject<HTMLDivElement | null>
  virtualItems: VirtualItem[]
  visibilityOptions?: VisibilityOptions
}

/**
 * Manages `onVisibilityChange` semantics for the Viewport: overlap threshold,
 * dwell time before promoting to `entered`, and trailing debounce of the
 * whole computation.
 *
 * Skips all work when no `onVisibilityChange` handler is provided.
 */
export function useVisibilityTracker<TItem>({
  getItemKey,
  items,
  onVisibilityChange,
  scrollRef,
  virtualItems,
  visibilityOptions,
}: UseVisibilityTrackerArgs<TItem>) {
  const onVisibilityChangeRef = useLatest(onVisibilityChange)
  const visibilityOptionsRef = useLatest(visibilityOptions)
  const visibleKeysRef = useRef<ItemKey[]>([])
  const pendingFirstSeenRef = useRef<Map<ItemKey, number>>(new Map())
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const compute = useCallback(() => {
    const callback = onVisibilityChangeRef.current

    if (!callback) {
      return
    }

    const element = scrollRef.current

    if (!element) {
      return
    }

    const options = visibilityOptionsRef.current
    const thresholdPercent = options?.thresholdPercent ?? 0
    const dwellMs = Math.max(0, options?.dwellMs ?? 0)
    const viewTop = element.scrollTop
    const viewBottom = viewTop + element.clientHeight
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now()
    const overlapping = new Set<ItemKey>()

    for (const virtualItem of virtualItems) {
      const itemTop = virtualItem.start
      const itemBottom = virtualItem.end
      const overlap =
        Math.min(itemBottom, viewBottom) - Math.max(itemTop, viewTop)

      if (overlap <= 0) {
        continue
      }

      const itemSize = itemBottom - itemTop

      if (itemSize > 0 && overlap / itemSize < thresholdPercent) {
        continue
      }

      const item = items[virtualItem.index]

      if (item === undefined) {
        continue
      }

      overlapping.add(getItemKey(item, virtualItem.index))
    }

    const pending = pendingFirstSeenRef.current

    for (const key of overlapping) {
      if (!pending.has(key)) {
        pending.set(key, now)
      }
    }

    for (const key of [...pending.keys()]) {
      if (!overlapping.has(key)) {
        pending.delete(key)
      }
    }

    const dwellPassed = new Set<ItemKey>()
    let nextDueIn = Number.POSITIVE_INFINITY

    for (const [key, firstSeen] of pending) {
      const elapsed = now - firstSeen

      if (elapsed >= dwellMs) {
        dwellPassed.add(key)
      } else {
        nextDueIn = Math.min(nextDueIn, dwellMs - elapsed)
      }
    }

    const orderedVisible: ItemKey[] = []

    for (const virtualItem of virtualItems) {
      const item = items[virtualItem.index]

      if (item === undefined) {
        continue
      }

      const key = getItemKey(item, virtualItem.index)

      if (dwellPassed.has(key)) {
        orderedVisible.push(key)
      }
    }

    if (dwellTimerRef.current !== null) {
      clearTimeout(dwellTimerRef.current)
      dwellTimerRef.current = null
    }

    if (Number.isFinite(nextDueIn)) {
      dwellTimerRef.current = setTimeout(
        () => {
          dwellTimerRef.current = null
          compute()
        },
        Math.max(1, Math.ceil(nextDueIn)),
      )
    }

    const previous = visibleKeysRef.current

    if (
      orderedVisible.length === previous.length &&
      orderedVisible.every((key, index) => key === previous[index])
    ) {
      return
    }

    const previousSet = new Set(previous)
    const change: VisibilityChange = {
      entered: orderedVisible.filter((key) => !previousSet.has(key)),
      exited: previous.filter((key) => !dwellPassed.has(key)),
      visible: orderedVisible,
    }

    visibleKeysRef.current = orderedVisible
    callback(change)
  }, [
    getItemKey,
    items,
    onVisibilityChangeRef,
    scrollRef,
    virtualItems,
    visibilityOptionsRef,
  ])

  useEffect(() => {
    if (!onVisibilityChangeRef.current) {
      return
    }

    const debounceMs = Math.max(
      0,
      visibilityOptionsRef.current?.debounceMs ?? 0,
    )

    if (debounceMs === 0) {
      compute()
      return
    }

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      compute()
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [compute, onVisibilityChangeRef, visibilityOptionsRef])

  useEffect(() => {
    return () => {
      if (dwellTimerRef.current !== null) {
        clearTimeout(dwellTimerRef.current)
        dwellTimerRef.current = null
      }
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      pendingFirstSeenRef.current.clear()
    }
  }, [])
}
