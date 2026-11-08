const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadSource } = require('./load-source.cjs')
const { createGamepadGate, gamepadAction } = loadSource('src/renderer/src/controls.ts')
const { toggleFavorite } = loadSource('src/renderer/src/profiles.ts')

test('controller waits for neutral after returning from a game and repeats only navigation', () => {
  const gate = createGamepadGate()
  assert.equal(gate('accept', 0, true), null)
  gate(null, 1, true)
  assert.equal(gate('accept', 2, true), 'accept')
  assert.equal(gate('accept', 1000, true), null)
  gate('accept', 1001, false)
  assert.equal(gate('accept', 1002, true), null)
  gate(null, 1003, true)
  assert.equal(gate('down', 1004, true), 'down')
  assert.equal(gate('down', 1200, true), null)
  assert.equal(gate('down', 1384, true), 'down')
  assert.equal(gate('down', 1544, true), 'down')
})

test('standard controller buttons and dead zone map safely', () => {
  const pad = { mapping: 'standard', axes: [0.3, -0.3], buttons: [] }
  assert.equal(gamepadAction(pad), null)
  pad.axes[1] = -0.8
  assert.equal(gamepadAction(pad), 'up')
  pad.buttons[3] = { pressed: true }
  assert.equal(gamepadAction(pad), 'favorite')
  pad.mapping = ''
  assert.equal(gamepadAction(pad), null)
})

test('favorites survive serialization and remain isolated by profile and system', () => {
  const original = {
    active: 'dad',
    profiles: [
      { id: 'dad', name: 'Papá', favorites: [] },
      { id: 'me', name: 'Yo', favorites: ['snes:Gridlee'] }
    ]
  }
  const saved = JSON.parse(JSON.stringify(toggleFavorite(original, 'arcade:Gridlee')))
  assert.deepEqual(saved.profiles[0].favorites, ['arcade:Gridlee'])
  assert.deepEqual(saved.profiles[1].favorites, ['snes:Gridlee'])
  assert.deepEqual(original.profiles[0].favorites, [])
  assert.deepEqual(toggleFavorite(saved, 'arcade:Gridlee').profiles[0].favorites, [])
  const switched = toggleFavorite({ ...saved, active: 'me' }, 'arcade:Gridlee')
  assert.deepEqual(switched.profiles[0].favorites, ['arcade:Gridlee'])
  assert.deepEqual(switched.profiles[1].favorites, ['snes:Gridlee', 'arcade:Gridlee'])
})
