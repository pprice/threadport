import { useCallback, useEffect, useRef } from 'react'
import type { ViewportState } from '../types'
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
  const stateFrameRef = useRef<number | null>(null)
  const settledStateFrameRef = useRef<number | null>(null)
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

  const scheduleStateEmit = useCallback(() => {
    if (!onStateChangeRef.current || stateFrameRef.current !== null) {
      return
    }

    stateFrameRef.current = requestAnimationFrame(() => {
      stateFrameRef.current = null
      emitState()
    })
  }, [emitState, onStateChangeRef])

  const scheduleSettledStateEmit = useCallback(() => {
    if (!onStateChangeRef.current || settledStateFrameRef.current !== null) {
      return
    }

    settledStateFrameRef.current = requestAnimationFrame(() => {
      settledStateFrameRef.current = requestAnimationFrame(() => {
        settledStateFrameRef.current = null
        emitState()
      })
    })
  }, [emitState, onStateChangeRef])

  useEffect(() => {
    return () => {
      if (stateFrameRef.current !== null) {
        cancelAnimationFrame(stateFrameRef.current)
        stateFrameRef.current = null
      }

      if (settledStateFrameRef.current !== null) {
        cancelAnimationFrame(settledStateFrameRef.current)
        settledStateFrameRef.current = null
      }
    }
  }, [])

  return {
    emitState,
    scheduleSettledStateEmit,
    scheduleStateEmit,
  }
}
