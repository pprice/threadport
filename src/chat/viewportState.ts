import type { ChatViewportState } from './ChatVirtualViewport.types'

export function shallowEqualState(
  previous: ChatViewportState | null,
  next: ChatViewportState,
) {
  return (
    previous !== null &&
    previous.distanceFromHead === next.distanceFromHead &&
    previous.distanceFromTail === next.distanceFromTail &&
    previous.isAtHead === next.isAtHead &&
    previous.isAtTail === next.isAtTail &&
    previous.isScrolling === next.isScrolling &&
    previous.scrollbarInlineSize === next.scrollbarInlineSize &&
    previous.scrollOffset === next.scrollOffset &&
    previous.scrollSize === next.scrollSize &&
    previous.viewportSize === next.viewportSize &&
    previous.scrollDirection === next.scrollDirection &&
    previous.totalItems === next.totalItems &&
    previous.virtualItems === next.virtualItems
  )
}
