import assert from 'node:assert/strict'
import * as threadport from '../dist/index.js'

const expectedExports = {
  Root: threadport.Root,
  Overlay: threadport.Overlay,
  Viewport: threadport.Viewport,
  Animation: threadport.Animation,
  readScrollbarInlineSize: threadport.readScrollbarInlineSize,
  useRootState: threadport.useRootState,
}

for (const [exportName, value] of Object.entries(expectedExports)) {
  assert.ok(value, `Expected ${exportName} to be exported`)
}

assert.equal(typeof threadport.Animation.easeOutCubic, 'function')
assert.equal(threadport.Animation.easeOutCubic(420).duration, 420)
assert.equal(typeof threadport.Animation.easeOutQuad, 'function')
assert.equal(typeof threadport.Animation.easeOutQuart, 'function')
assert.equal(typeof threadport.Animation.easeOutQuint, 'function')
assert.equal(typeof threadport.Animation.easeInOutCubic, 'function')
assert.equal(typeof threadport.Animation.linear, 'function')
assert.equal(threadport.easeOutCubic, undefined)
