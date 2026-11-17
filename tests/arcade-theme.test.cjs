const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadSource } = require('./load-source.cjs')
const { arcadeDemoIndex, validArcadeVideo } = loadSource('src/renderer/src/arcadeThemePlan.ts')

test('arcade demonstration waits for idle and never advances while blocked or empty', () => {
  const state = { now: 44999, lastInput: 0, count: 3, index: 2, blocked: false }
  assert.equal(arcadeDemoIndex(state), null)
  assert.equal(arcadeDemoIndex({ ...state, now: 45000 }), 0)
  assert.equal(arcadeDemoIndex({ ...state, now: 60000, blocked: true }), null)
  assert.equal(arcadeDemoIndex({ ...state, now: 60000, lastInput: 59000 }), null)
  assert.equal(arcadeDemoIndex({ ...state, now: 60000, count: 0 }), null)
  assert.equal(arcadeDemoIndex({ ...state, now: 60000, count: 1 }), null)
})

test('arcade preview accepts bounded local video selections', () => {
  assert.equal(validArcadeVideo('Gridlee.MP4', 25516), true)
  assert.equal(validArcadeVideo('Gridlee.webm', 100 * 1024 * 1024), true)
  assert.equal(validArcadeVideo('Gridlee.mp4.exe', 500), false)
  assert.equal(validArcadeVideo('Gridlee.mp4', 101 * 1024 * 1024), false)
  assert.equal(validArcadeVideo('Gridlee.mp4', 0), false)
})
