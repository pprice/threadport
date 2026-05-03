import { easeOutCubic, easeOutQuart } from '../../src'
import type {
  ChatScrollAnimation,
  ChatScrollToItemOptions,
  ChatVirtualViewportProps,
} from '../../src'

type Item = {
  id: string
}

const animation: ChatScrollAnimation = easeOutCubic(420)

void animation

const itemOptions: ChatScrollToItemOptions = {
  align: 'head',
  animation: easeOutQuart(560),
}

void itemOptions

const props: ChatVirtualViewportProps<Item> = {
  estimateSize: () => 80,
  getItemKey: (item) => item.id,
  items: [{ id: '1' }],
  renderItem: ({ item }) => <div>{item.id}</div>,
  scrollAnimation: easeOutCubic(420),
}

void props

const durationMustBeNested: ChatScrollToItemOptions = {
  align: 'head',
  // @ts-expect-error Item scroll animation belongs in the animation object.
  duration: 560,
}

void durationMustBeNested

const easingMustBeNested: ChatScrollToItemOptions = {
  align: 'head',
  // @ts-expect-error Item scroll easing belongs in the animation object.
  easing: easeOutCubic(420).easing,
}

void easingMustBeNested
