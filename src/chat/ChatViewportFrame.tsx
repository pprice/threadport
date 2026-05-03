import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type WheelEvent,
} from 'react'

export type ChatViewportFrameState = {
  headInset: number
  scrollbarInlineSize: number
  tailInset: number
}

export type ChatViewportFrameRegistration = {
  headInset: number
  requestStateUpdate?: () => void
  scrollElement: HTMLElement | null
  tailInset: number
}

export type ChatViewportFrameProps = {
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

export type ChatViewportOverlayPlacement = 'fill' | 'head' | 'tail'

export type ChatViewportOverlayProps = {
  avoidScrollbar?: boolean
  children?: ReactNode
  className?: string
  forwardWheelToViewport?: boolean
  placement?: ChatViewportOverlayPlacement
  pointerEvents?: CSSProperties['pointerEvents']
  style?: CSSProperties
}

type ChatViewportFrameContextValue = {
  registerViewport: (
    registration: ChatViewportFrameRegistration,
  ) => () => void
  requestViewportStateUpdate: () => void
  scrollElement: HTMLElement | null
  state: ChatViewportFrameState
}

type ChatViewportFrameStyle = CSSProperties & {
  '--chat-head-inset'?: string
  '--chat-scrollbar-inline-size'?: string
  '--chat-tail-inset'?: string
}

const initialState: ChatViewportFrameState = {
  headInset: 0,
  scrollbarInlineSize: 0,
  tailInset: 0,
}

const ChatViewportFrameContext =
  createContext<ChatViewportFrameContextValue | null>(null)

function clampSize(value: number) {
  return Math.max(0, Number.isFinite(value) ? value : 0)
}

function sameFrameState(
  previous: ChatViewportFrameState,
  next: ChatViewportFrameState,
) {
  return (
    previous.headInset === next.headInset &&
    previous.scrollbarInlineSize === next.scrollbarInlineSize &&
    previous.tailInset === next.tailInset
  )
}

function setStateIfChanged(
  setState: (updater: (state: ChatViewportFrameState) => ChatViewportFrameState) => void,
  patch: Partial<ChatViewportFrameState>,
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
  const borderInlineStart = Number.parseFloat(styles.borderInlineStartWidth) || 0
  const borderInlineEnd = Number.parseFloat(styles.borderInlineEndWidth) || 0

  return clampSize(
    rect.width - element.clientWidth - borderInlineStart - borderInlineEnd,
  )
}

export function useChatViewportFrameRegistration() {
  return useContext(ChatViewportFrameContext)?.registerViewport
}

export function useChatViewportFrameState() {
  return useContext(ChatViewportFrameContext)?.state ?? initialState
}

export function ChatViewportFrame({
  children,
  className,
  style,
}: ChatViewportFrameProps) {
  const registrationIdRef = useRef(0)
  const requestStateUpdateRef = useRef<(() => void) | null>(null)
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null)
  const [state, setState] = useState<ChatViewportFrameState>(initialState)

  const registerViewport = useCallback(
    ({
      headInset,
      requestStateUpdate,
      scrollElement,
      tailInset,
    }: ChatViewportFrameRegistration) => {
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
  const frameStyle: ChatViewportFrameStyle = {
    '--chat-head-inset': `${state.headInset}px`,
    '--chat-scrollbar-inline-size': `${state.scrollbarInlineSize}px`,
    '--chat-tail-inset': `${state.tailInset}px`,
    position: 'relative',
    ...style,
  }

  return (
    <ChatViewportFrameContext.Provider value={contextValue}>
      <div className={className} style={frameStyle}>
        {children}
      </div>
    </ChatViewportFrameContext.Provider>
  )
}

export function ChatViewportOverlay({
  avoidScrollbar = true,
  children,
  className,
  forwardWheelToViewport = true,
  placement = 'fill',
  pointerEvents = 'none',
  style,
}: ChatViewportOverlayProps) {
  const frameContext = useContext(ChatViewportFrameContext)
  const scrollElement = frameContext?.scrollElement ?? null
  const insetInlineEnd = avoidScrollbar
    ? 'var(--chat-scrollbar-inline-size, 0px)'
    : 0
  const overlayStyle: CSSProperties = {
    insetInlineEnd,
    insetInlineStart: 0,
    pointerEvents,
    position: 'absolute',
    ...style,
  }

  if (placement === 'head') {
    overlayStyle.blockSize = 'var(--chat-head-inset, 0px)'
    overlayStyle.insetBlockStart = 0
  } else if (placement === 'tail') {
    overlayStyle.blockSize = 'var(--chat-tail-inset, 0px)'
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
      Math.max(
        0,
        currentScrollTop + wheelDeltaToPixels(event, scrollElement),
      ),
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
