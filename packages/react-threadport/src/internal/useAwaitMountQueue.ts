import { useEffect, useRef } from 'react'
import type { ItemKey, ScrollResult } from '../types'

const AWAIT_MOUNT_TIMEOUT_MS = 1000

type PendingEntry = {
  key: ItemKey
  timeoutId: ReturnType<typeof setTimeout>
  resolve: (result: ScrollResult) => void
  run: () => void
}

export type AwaitMountQueue = {
  /** Register a pending awaitMount target. Returns the promise via the supplied resolve callback. */
  enqueue: (
    key: ItemKey,
    run: () => void,
    resolve: (result: ScrollResult) => void,
  ) => void
  /**
   * Inspect the queue against the current items map. Any entry whose key is
   * now present has its timeout cleared and its `run` invoked; the rest stay
   * queued until the next call.
   */
  flush: (keyToIndex: Map<ItemKey, number>) => void
}

/**
 * Tracks `scrollToItem({ awaitMount: true })` requests issued before the
 * target key exists in `items`. Each request gets a 1000ms timeout; if the
 * key appears in time the queued `run` fires, otherwise the request resolves
 * with `'rejected'`.
 *
 * Pending entries are flushed (and rejected) on unmount.
 */
export function useAwaitMountQueue(): AwaitMountQueue {
  const pendingRef = useRef<PendingEntry[]>([])

  useEffect(() => {
    return () => {
      pendingRef.current.forEach((entry) => {
        clearTimeout(entry.timeoutId)
        entry.resolve('rejected')
      })
      pendingRef.current = []
    }
  }, [])

  return useRef<AwaitMountQueue>({
    enqueue(key, run, resolve) {
      const timeoutId = setTimeout(() => {
        const index = pendingRef.current.findIndex(
          (entry) => entry.timeoutId === timeoutId,
        )

        if (index >= 0) {
          pendingRef.current.splice(index, 1)
        }

        resolve('rejected')
      }, AWAIT_MOUNT_TIMEOUT_MS)

      pendingRef.current.push({ key, timeoutId, resolve, run })
    },
    flush(keyToIndex) {
      if (pendingRef.current.length === 0) {
        return
      }

      const remaining: PendingEntry[] = []

      pendingRef.current.forEach((entry) => {
        if (keyToIndex.has(entry.key)) {
          clearTimeout(entry.timeoutId)
          entry.run()
        } else {
          remaining.push(entry)
        }
      })

      pendingRef.current = remaining
    },
  }).current
}
