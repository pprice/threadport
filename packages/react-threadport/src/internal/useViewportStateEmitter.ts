import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { ViewportState } from '../types'
import {
  createFrameDebouncer,
  createSettledFrameScheduler,
} from './scheduleFrame'
import { useLatest } from './useLatest'
import { shallowEqualState } from './viewportState'

type UseViewportStateEmitterArgs = {
  onStateChange?: (state: ViewportState) => void
  readState: () => ViewportState
}

export function useViewportStateEmitter({
  onStateChange,
  readState,
}: UseViewportStateEmitterArgs) {
  const lastStateRef = useRef<ViewportState | null>(null)
  const onStateChangeRef = useLatest(onStateChange)
  const readStateRef = useLatest(readState)

  const emitState = useCallback(() => {
    const handler = onStateChangeRef.current

    if (!handler) {
      return
    }

    const next = readStateRef.current()

    if (shallowEqualState(lastStateRef.current, next)) {
      return
    }

    lastStateRef.current = next
    handler(next)
  }, [onStateChangeRef, readStateRef])

  const stateScheduler = useMemo(
    () => createFrameDebouncer(emitState),
    [emitState],
  )
  const settledScheduler = useMemo(
    () => createSettledFrameScheduler(emitState),
    [emitState],
  )

  const scheduleStateEmit = useCallback(() => {
    if (!onStateChangeRef.current) {
      return
    }

    stateScheduler.request()
  }, [onStateChangeRef, stateScheduler])

  const scheduleSettledStateEmit = useCallback(() => {
    if (!onStateChangeRef.current) {
      return
    }

    settledScheduler.request()
  }, [onStateChangeRef, settledScheduler])

  useEffect(() => {
    return () => {
      stateScheduler.cancel()
      settledScheduler.cancel()
    }
  }, [stateScheduler, settledScheduler])

  return {
    emitState,
    scheduleSettledStateEmit,
    scheduleStateEmit,
  }
}
