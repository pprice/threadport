import type { Virtualizer } from '@tanstack/react-virtual'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import type { ItemKey } from '../types'
import { createFrameThrottle, nextFrame } from './scheduleFrame'
import { useLatest } from './useLatest'

type AnchorSnapshot = {
  elementTop: number | null
  itemKey: ItemKey
  scrollDelta: number
}

type Args<TItem> = {
  getItemKey: (item: TItem, index: number) => ItemKey
  items: readonly TItem[]
  keyToIndex: Map<ItemKey, number>
  scrollRef: RefObject<HTMLDivElement | null>
  virtualizer: Virtualizer<HTMLDivElement, HTMLDivElement>
}

/**
 * Owns the anchor snapshot used to preserve the visible scroll position
 * across prepends and to refit after scroll-settle events.
 *
 * Returns:
 * - `captureAnchor()` — record the current visible anchor (key + offset).
 * - `captureAnchorThrottle` — leading-edge once-per-frame wrapper, suitable
 *   for the scroll handler.
 * - `restoreIfPrepended()` — if a captured anchor is still in the items
 *   array but its index moved (a prepend), restore its visible position.
 *   Returns `true` if a restoration ran.
 */
export function useAnchorManager<TItem>({
  getItemKey,
  items,
  keyToIndex,
  scrollRef,
  virtualizer,
}: Args<TItem>) {
  const anchorRef = useRef<AnchorSnapshot | null>(null)

  function captureAnchor() {
    const element = scrollRef.current

    if (!element || items.length === 0) {
      return
    }

    const virtualItems = virtualizer.getVirtualItems()
    const anchorItem =
      virtualItems.find(
        (virtualItem) => virtualItem.end >= element.scrollTop,
      ) ??
      virtualizer.getVirtualItemForOffset(element.scrollTop) ??
      virtualItems[0]

    if (!anchorItem) {
      return
    }

    const item = items[anchorItem.index]

    if (item === undefined) {
      return
    }

    anchorRef.current = {
      elementTop:
        element
          .querySelector<HTMLElement>(`[data-index="${anchorItem.index}"]`)
          ?.getBoundingClientRect().top ?? null,
      itemKey: getItemKey(item, anchorItem.index),
      scrollDelta: element.scrollTop - anchorItem.start,
    }
  }

  const captureAnchorRef = useLatest(captureAnchor)
  const captureAnchorThrottle = useMemo(
    () => createFrameThrottle(() => captureAnchorRef.current()),
    [captureAnchorRef],
  )

  useEffect(() => () => captureAnchorThrottle.cancel(), [captureAnchorThrottle])

  function restoreAnchorElementTop(index: number, anchor: AnchorSnapshot) {
    const element = scrollRef.current

    if (!element || anchor.elementTop === null) {
      return false
    }

    const anchorElement = element.querySelector<HTMLElement>(
      `[data-index="${index}"]`,
    )
    const nextTop = anchorElement?.getBoundingClientRect().top

    if (nextTop === undefined) {
      return false
    }

    const delta = nextTop - anchor.elementTop

    if (Math.abs(delta) >= 0.5) {
      element.scrollTop += delta
    }

    return true
  }

  function restoreIfPrepended() {
    const anchor = anchorRef.current
    const element = scrollRef.current

    if (!anchor || !element) {
      return
    }

    const anchorIndex = keyToIndex.get(anchor.itemKey)

    if (anchorIndex === undefined) {
      return
    }

    if (restoreAnchorElementTop(anchorIndex, anchor)) {
      return
    }

    const offset =
      virtualizer
        .getVirtualItems()
        .find((virtualItem) => virtualItem.index === anchorIndex)?.start ??
      virtualizer.getOffsetForIndex(anchorIndex, 'start')?.[0]

    if (offset === undefined) {
      return
    }

    element.scrollTop = offset + anchor.scrollDelta
    nextFrame(() => restoreAnchorElementTop(anchorIndex, anchor))
  }

  return {
    captureAnchor,
    captureAnchorThrottle,
    restoreIfPrepended,
  }
}
