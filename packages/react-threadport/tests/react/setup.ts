import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

Object.defineProperties(HTMLElement.prototype, {
  clientHeight: {
    configurable: true,
    get() {
      return Number.parseFloat(this.style.height) || 260
    },
  },
  clientWidth: {
    configurable: true,
    get() {
      return Number.parseFloat(this.style.width) || 360
    },
  },
  scrollHeight: {
    configurable: true,
    get() {
      return (
        Number.parseFloat(
          this.firstElementChild?.getAttribute('data-test-size') ?? '',
        ) || 260
      )
    },
  },
  scrollWidth: {
    configurable: true,
    get() {
      return 360
    },
  },
})

HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
  const height =
    Number.parseFloat(this.style.height) || this.clientHeight || 260
  const width = Number.parseFloat(this.style.width) || this.clientWidth || 360

  return {
    bottom: height,
    height,
    left: 0,
    right: width,
    toJSON() {
      return this
    },
    top: 0,
    width,
    x: 0,
    y: 0,
  }
}

class TestResizeObserver implements ResizeObserver {
  private callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  disconnect() {}

  observe(target: Element) {
    this.callback(
      [
        {
          borderBoxSize: [],
          contentBoxSize: [],
          contentRect: target.getBoundingClientRect(),
          devicePixelContentBoxSize: [],
          target,
        },
      ],
      this,
    )
  }

  unobserve() {}
}

globalThis.ResizeObserver = TestResizeObserver
