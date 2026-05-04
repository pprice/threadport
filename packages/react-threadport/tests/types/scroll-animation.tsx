import type {
  ScrollAnimation,
  ScrollToItemOptions,
  ViewportProps,
} from '../../src'
import { Animation } from '../../src'

type Item = {
  id: string
}

const animation: ScrollAnimation = Animation.easeOutCubic(420)

void animation

const itemOptions: ScrollToItemOptions = {
  align: 'head',
  animation: Animation.easeOutQuart(560),
}

void itemOptions

const props: ViewportProps<Item> = {
  estimateSize: () => 80,
  getItemKey: (item) => item.id,
  items: [{ id: '1' }],
  renderItem: ({ item }) => <div>{item.id}</div>,
  scrollAnimation: Animation.easeOutCubic(420),
}

void props

const durationMustBeNested: ScrollToItemOptions = {
  align: 'head',
  // @ts-expect-error Item scroll animation belongs in the animation object.
  duration: 560,
}

void durationMustBeNested

const easingMustBeNested: ScrollToItemOptions = {
  align: 'head',
  // @ts-expect-error Item scroll easing belongs in the animation object.
  easing: Animation.easeOutCubic(420).easing,
}

void easingMustBeNested
