import type { ViewportProps, VirtualizerOptions } from '../../src'

type Item = {
  id: string
}

const safeOptions: VirtualizerOptions = {
  debug: true,
  gap: 4,
  isScrollingResetDelay: 120,
  overscan: 8,
  useAnimationFrameWithResizeObserver: false,
  useScrollendEvent: true,
}

const props: ViewportProps<Item> = {
  estimateSize: () => 80,
  getItemKey: (item) => item.id,
  items: [{ id: '1' }],
  renderItem: ({ item }) => <div>{item.id}</div>,
  virtualizerOptions: safeOptions,
}

void props

const shorthandOverrides: ViewportProps<Item> = {
  estimateSize: () => 80,
  getItemKey: (item) => item.id,
  itemGap: 8,
  items: [{ id: '1' }],
  overscan: 12,
  renderItem: ({ item }) => <div>{item.id}</div>,
  virtualizerOptions: {
    gap: 4,
    overscan: 2,
  },
}

void shorthandOverrides

const countIsOwned: VirtualizerOptions = {
  // @ts-expect-error Threadport owns item count.
  count: 10,
}

void countIsOwned

const scrollElementIsOwned: VirtualizerOptions = {
  // @ts-expect-error Threadport owns the scroll element.
  getScrollElement: () => null,
}

void scrollElementIsOwned

const paddingIsOwned: VirtualizerOptions = {
  // @ts-expect-error Threadport derives padding from head/tail insets.
  paddingStart: 24,
}

void paddingIsOwned

const changeHandlerIsOwned: VirtualizerOptions = {
  // @ts-expect-error Threadport owns virtualizer change handling.
  onChange: () => undefined,
}

void changeHandlerIsOwned

const lanesAreOwned: VirtualizerOptions = {
  // @ts-expect-error Threadport is a one-dimensional chat viewport.
  lanes: 2,
}

void lanesAreOwned
