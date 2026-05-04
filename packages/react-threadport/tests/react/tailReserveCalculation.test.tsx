import { describe, expect, it } from 'vitest'
import {
  resolveMaxScrollTop,
  resolveTailReserveMinHeight,
  resolveUnconsumedTailReserve,
} from '../../src/internal/tailReserveCalculation'

describe('tail reserve calculation', () => {
  it('subtracts insets and appended content before the tail from default reserve', () => {
    expect(
      resolveTailReserveMinHeight({
        consumedBeforeTail: 72,
        headInset: 28,
        headReserve: 0,
        minHeight: undefined,
        tailInset: 108,
        viewportSize: 640,
      }),
    ).toBe(432)
  })

  it('preserves explicit minHeight overrides', () => {
    expect(
      resolveTailReserveMinHeight({
        consumedBeforeTail: 72,
        headInset: 28,
        headReserve: 0,
        minHeight: 360,
        tailInset: 108,
        viewportSize: 640,
      }),
    ).toBe(360)

    expect(
      resolveTailReserveMinHeight({
        consumedBeforeTail: 72,
        headInset: 28,
        headReserve: 12,
        minHeight: ({ headReserve, viewportSize }) =>
          viewportSize / 2 + headReserve,
        tailInset: 108,
        viewportSize: 640,
      }),
    ).toBe(332)
  })

  it('burns down reserve with measured active tail content', () => {
    expect(
      resolveUnconsumedTailReserve({
        activeTailReserveKey: 'assistant',
        contentSize: 300,
        enabled: true,
        minHeight: 432,
      }),
    ).toBe(132)

    expect(
      resolveMaxScrollTop({
        scrollSize: 1200,
        unconsumedTailReserve: 132,
        viewportSize: 640,
      }),
    ).toBe(428)
  })
})
