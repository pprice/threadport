import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

const testResizeObservers = new Set<TestResizeObserver>()
let frameId = 0
const pendingFrames = new Map<number, ReturnType<typeof setTimeout>>()

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (callback) => {
    frameId += 1
    const id = frameId
    const timeout = setTimeout(() => {
      pendingFrames.delete(id)
      callback(performance.now())
    }, 0)

    pendingFrames.set(id, timeout)

    return id
  }

  globalThis.cancelAnimationFrame = (id) => {
    const timeout = pendingFrames.get(id)

    if (timeout) {
      clearTimeout(timeout)
      pendingFrames.delete(id)
    }
  }
}

function readNumericAttribute(element: HTMLElement, name: string) {
  return Number.parseFloat(element.getAttribute(name) ?? '')
}

function readNumericStyle(element: HTMLElement, name: 'height' | 'width') {
  return Number.parseFloat(element.style[name])
}

function readElementHeight(element: Element | null): number {
  if (!(element instanceof HTMLElement)) {
    return 260
  }

  const ownHeight =
    readNumericAttribute(element, 'data-test-height') ||
    readNumericAttribute(element, 'data-test-size') ||
    readNumericStyle(element, 'height')

  if (ownHeight) {
    return ownHeight
  }

  const child = element.firstElementChild

  if (child instanceof HTMLElement) {
    const childHeight =
      readNumericAttribute(child, 'data-test-height') ||
      readNumericAttribute(child, 'data-test-size') ||
      readNumericStyle(child, 'height')

    if (childHeight) {
      return childHeight
    }
  }

  return 260
}

function readElementWidth(element: Element | null): number {
  if (!(element instanceof HTMLElement)) {
    return 360
  }

  return (
    readNumericAttribute(element, 'data-test-width') ||
    readNumericStyle(element, 'width') ||
    360
  )
}

function readTranslateY(element: HTMLElement): number {
  const match = element.style.transform.match(
    /translateY\((-?\d+(?:\.\d+)?)px\)/,
  )

  return match ? Number.parseFloat(match[1] ?? '0') : 0
}

afterEach(() => {
  cleanup()
  testResizeObservers.clear()
  pendingFrames.forEach((timeout) => {
    clearTimeout(timeout)
  })
  pendingFrames.clear()
})

Object.defineProperties(HTMLElement.prototype, {
  clientHeight: {
    configurable: true,
    get() {
      return readElementHeight(this)
    },
  },
  clientWidth: {
    configurable: true,
    get() {
      return readElementWidth(this)
    },
  },
  offsetHeight: {
    configurable: true,
    get() {
      return readElementHeight(this)
    },
  },
  offsetWidth: {
    configurable: true,
    get() {
      return readElementWidth(this)
    },
  },
  scrollHeight: {
    configurable: true,
    get() {
      return readElementHeight(this.firstElementChild)
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
  const height = readElementHeight(this)
  const width = readElementWidth(this)
  const top = readTranslateY(this)

  return {
    bottom: top + height,
    height,
    left: 0,
    right: width,
    toJSON() {
      return this
    },
    top,
    width,
    x: 0,
    y: top,
  }
}

class TestResizeObserver implements ResizeObserver {
  private callback: ResizeObserverCallback
  private targets = new Set<Element>()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    testResizeObservers.add(this)
  }

  disconnect() {
    this.targets.clear()
    testResizeObservers.delete(this)
  }

  observe(target: Element) {
    this.targets.add(target)
    this.flush()
  }

  flush() {
    this.callback(
      [...this.targets].map((target) => {
        const rect = target.getBoundingClientRect()
        const box = {
          blockSize: rect.height,
          inlineSize: rect.width,
        } satisfies ResizeObserverSize

        return {
          borderBoxSize: [box],
          contentBoxSize: [box],
          contentRect: rect,
          devicePixelContentBoxSize: [box],
          target,
        } satisfies ResizeObserverEntry
      }),
      this,
    )
  }

  unobserve(target: Element) {
    this.targets.delete(target)
  }
}

globalThis.ResizeObserver = TestResizeObserver

globalThis.__flushResizeObservers = () => {
  testResizeObservers.forEach((observer) => {
    observer.flush()
  })
}

declare global {
  // eslint-disable-next-line no-var
  var __flushResizeObservers: (() => void) | undefined
}
