import {
  type CSSProperties,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from 'react'
import type {
  OverlayProps,
  RootProps,
  RootRegistration,
  RootState,
} from './types'

type RootContextValue = {
  registerViewport: (registration: RootRegistration) => () => void
  requestViewportStateUpdate: () => void
  scrollElement: HTMLElement | null
  state: RootState
}

type RootStyle = CSSProperties & {
  '--threadport-head-inset'?: string
  '--threadport-scrollbar-inline-size'?: string
  '--threadport-tail-inset'?: string
}

const initialState: RootState = {
  headInset: 0,
  scrollbarInlineSize: 0,
  tailInset: 0,
}

const RootContext = createContext<RootContextValue | null>(null)

function clampSize(value: number) {
  return Math.max(0, Number.isFinite(value) ? value : 0)
}

function sameFrameState(previous: RootState, next: RootState) {
  return (
    previous.headInset === next.headInset &&
    previous.scrollbarInlineSize === next.scrollbarInlineSize &&
    previous.tailInset === next.tailInset
  )
}

function setStateIfChanged(
  setState: (updater: (state: RootState) => RootState) => void,
  patch: Partial<RootState>,
) {
  setState((current) => {
    const next = {
      ...current,
      ...patch,
    }

    return sameFrameState(current, next) ? current : next
  })
}

function wheelDeltaToPixels(
  event: WheelEvent<HTMLElement>,
  scrollElement: HTMLElement,
) {
  if (event.deltaMode === 1) {
    return event.deltaY * 16
  }

  if (event.deltaMode === 2) {
    return event.deltaY * scrollElement.clientHeight
  }

  return event.deltaY
}

export function readScrollbarInlineSize(element: HTMLElement | null) {
  if (!element || typeof window === 'undefined') {
    return 0
  }

  const rect = element.getBoundingClientRect()
  const styles = window.getComputedStyle(element)
  const borderInlineStart =
    Number.parseFloat(styles.borderInlineStartWidth) || 0
  const borderInlineEnd = Number.parseFloat(styles.borderInlineEndWidth) || 0

  return clampSize(
    rect.width - element.clientWidth - borderInlineStart - borderInlineEnd,
  )
}

export function useRootRegistration() {
  return useContext(RootContext)?.registerViewport
}

export function useRootState() {
  return useContext(RootContext)?.state ?? initialState
}

export function Root({ children, className, style }: RootProps) {
  const registrationIdRef = useRef(0)
  const requestStateUpdateRef = useRef<(() => void) | null>(null)
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null)
  const [state, setState] = useState<RootState>(initialState)

  const registerViewport = useCallback(
    ({
      headInset,
      requestStateUpdate,
      scrollElement,
      tailInset,
    }: RootRegistration) => {
      const registrationId = registrationIdRef.current + 1
      registrationIdRef.current = registrationId
      requestStateUpdateRef.current = requestStateUpdate ?? null
      setScrollElement(scrollElement)
      setStateIfChanged(setState, {
        headInset: clampSize(headInset),
        tailInset: clampSize(tailInset),
      })

      return () => {
        if (registrationIdRef.current !== registrationId) {
          return
        }

        setScrollElement(null)
        requestStateUpdateRef.current = null
        setState(initialState)
      }
    },
    [],
  )
  const requestViewportStateUpdate = useCallback(() => {
    requestStateUpdateRef.current?.()
  }, [])

  useLayoutEffect(() => {
    if (!scrollElement) {
      setStateIfChanged(setState, { scrollbarInlineSize: 0 })
      return
    }

    function measureScrollbar() {
      setStateIfChanged(setState, {
        scrollbarInlineSize: readScrollbarInlineSize(scrollElement),
      })
    }

    measureScrollbar()

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measureScrollbar)

    observer?.observe(scrollElement)
    window.addEventListener('resize', measureScrollbar)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measureScrollbar)
    }
  }, [scrollElement])

  const contextValue = useMemo(
    () => ({
      registerViewport,
      requestViewportStateUpdate,
      scrollElement,
      state,
    }),
    [registerViewport, requestViewportStateUpdate, scrollElement, state],
  )
  const frameStyle: RootStyle = {
    '--threadport-head-inset': `${state.headInset}px`,
    '--threadport-scrollbar-inline-size': `${state.scrollbarInlineSize}px`,
    '--threadport-tail-inset': `${state.tailInset}px`,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    position: 'relative',
    ...style,
  }

  return (
    <RootContext.Provider value={contextValue}>
      <div className={className} style={frameStyle}>
        {children}
      </div>
    </RootContext.Provider>
  )
}

export function Overlay({
  avoidScrollbar = true,
  children,
  className,
  forwardWheelToViewport = true,
  placement = 'fill',
  pointerEvents = 'none',
  style,
}: OverlayProps) {
  const frameContext = useContext(RootContext)
  const scrollElement = frameContext?.scrollElement ?? null
  const insetInlineEnd = avoidScrollbar
    ? 'var(--threadport-scrollbar-inline-size, 0px)'
    : 0
  const overlayStyle: CSSProperties = {
    insetInlineEnd,
    insetInlineStart: 0,
    pointerEvents,
    position: 'absolute',
    ...style,
  }

  if (placement === 'head') {
    overlayStyle.blockSize = 'var(--threadport-head-inset, 0px)'
    overlayStyle.insetBlockStart = 0
  } else if (placement === 'tail') {
    overlayStyle.blockSize = 'var(--threadport-tail-inset, 0px)'
    overlayStyle.insetBlockEnd = 0
  } else {
    overlayStyle.insetBlockEnd = 0
    overlayStyle.insetBlockStart = 0
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (!forwardWheelToViewport || !scrollElement || event.defaultPrevented) {
      return
    }

    const currentScrollTop = scrollElement.scrollTop
    const maxScrollTop = Math.max(
      0,
      scrollElement.scrollHeight - scrollElement.clientHeight,
    )
    const nextScrollTop = Math.min(
      Math.max(0, currentScrollTop + wheelDeltaToPixels(event, scrollElement)),
      maxScrollTop,
    )

    event.preventDefault()

    if (Math.abs(nextScrollTop - currentScrollTop) < 0.5) {
      scrollElement.dispatchEvent(new Event('scroll', { bubbles: true }))
      frameContext?.requestViewportStateUpdate()
      return
    }

    scrollElement.scrollTop = nextScrollTop
    scrollElement.dispatchEvent(new Event('scroll', { bubbles: true }))
    frameContext?.requestViewportStateUpdate()
  }

  return (
    <div className={className} onWheel={handleWheel} style={overlayStyle}>
      {children}
    </div>
  )
}
