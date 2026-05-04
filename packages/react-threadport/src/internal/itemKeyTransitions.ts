import type { ItemKey } from '../types'

/**
 * Compute key-based transition signals between renders.
 *
 * - `lastKey`: the current last item's key, or null when items is empty.
 * - `previousLastIndex`: where the previous last key now sits in items, if at all.
 * - `appendedToTail`: true when the previous last item is still in items but
 *   no longer at the end. Covers both pure appends (length grew) and
 *   rolling-buffer appends (head trimmed + tail appended in one update).
 */
export function computeItemKeyTransition<TItem>(
  items: readonly TItem[],
  getItemKey: (item: TItem, index: number) => ItemKey,
  keyToIndex: Map<ItemKey, number>,
  previousLastKey: ItemKey | null,
) {
  const lastIndex = items.length - 1
  const lastItem = lastIndex >= 0 ? items[lastIndex] : undefined
  const lastKey =
    lastItem !== undefined ? getItemKey(lastItem, lastIndex) : null
  const previousLastIndex =
    previousLastKey !== null ? keyToIndex.get(previousLastKey) : undefined
  const appendedToTail =
    previousLastKey !== null &&
    previousLastKey !== lastKey &&
    previousLastIndex !== undefined &&
    previousLastIndex < lastIndex

  return { lastKey, previousLastIndex, appendedToTail }
}
