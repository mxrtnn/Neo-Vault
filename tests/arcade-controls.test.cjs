const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { loadSource } = require('./load-source.cjs')
const model = loadSource('src/shared/arcadeControls.ts')
const persistence = loadSource('src/main/arcadeControls.ts')
const navigation = loadSource('src/renderer/src/navigationControls.ts')
const { gamepadAction } = loadSource('src/renderer/src/controls.ts')

test('arcade mappings generate safe MAME sequences with permanent menu and pause fallbacks', () => {
  const controls = model.defaultArcadeControls()
  controls.P1_BUTTON1 = { key: 'KeyZ', button: 4 }
  const xml = model.arcadeControllerXml(controls)
  assert.match(xml, /KEYCODE_Z OR JOYCODE_1_BUTTON4/)
  assert.match(xml, /type="P1_BUTTON8"/)
  assert.match(xml, /KEYCODE_TAB/)
  assert.match(xml, /KEYCODE_P.*KEYCODE_F5/)
  assert.match(xml, /JOYCODE_1_YAXIS_UP_SWITCH/)
  assert.match(xml, /JOYCODE_1_HAT1UP/)
  assert.throws(() =>
    model.validateArcadeControls({ ...controls, P1_BUTTON1: { key: '"><script>', button: 1 } })
  )
  assert.throws(() =>
    model.validateArcadeControls({ ...controls, P1_BUTTON1: { key: 'Tab', button: 1 } })
  )
  assert.throws(() =>
    model.validateArcadeControls({ ...controls, P1_BUTTON1: { key: 'KeyP', button: 1 } })
  )
  assert.throws(() =>
    model.validateArcadeControls({ ...controls, UI_PAUSE: { key: 'KeyP', button: 99 } })
  )
})

test('arcade controls persist per profile without replacing game-specific configuration', async () => {
  await fs.mkdir('work', { recursive: true })
  const root = await fs.mkdtemp(path.resolve('work/control-check-'))
  const controls = model.defaultArcadeControls()
  controls.P1_BUTTON1.key = 'KeyZ'
  await persistence.saveArcadeControls(root, 'dad', controls)
  assert.equal((await persistence.readArcadeControls(root, 'dad')).P1_BUTTON1.key, 'KeyZ')
  assert.equal((await persistence.readArcadeControls(root, 'me')).P1_BUTTON1.key, 'ControlLeft')
  const perGame = path.join(root, 'data/profiles/dad/arcade/existing/cfg/ffight.cfg')
  await fs.mkdir(path.dirname(perGame), { recursive: true })
  await fs.writeFile(perGame, 'existing game controls')
  const args = await persistence.prepareArcadeControls(root, 'dad')
  assert.equal(args[args.indexOf('-pause_brightness') + 1], '0.35')
  assert.equal(args[args.indexOf('-ctrlr') + 1], 'neovault')
  assert.equal(await fs.readFile(perGame, 'utf8'), 'existing game controls')
  assert.throws(() => persistence.controlDirectory(root, '../escape'))
  const file = path.join(persistence.controlDirectory(root, 'dad'), 'controls.json')
  await fs.writeFile(file, '{broken')
  await assert.rejects(persistence.readArcadeControls(root, 'dad'))
  assert.equal(await fs.readFile(file, 'utf8'), '{broken')
})

test('custom navigation changes keyboard and gamepad actions independently of arcade controls', () => {
  const bindings = navigation.defaultNavigation()
  bindings.accept = { key: 'KeyQ', button: 2 }
  assert.equal(navigation.navigationKey(bindings, 'KeyQ'), 'accept')
  assert.equal(navigation.navigationKey(bindings, 'Enter'), null)
  const pad = {
    mapping: 'standard',
    axes: [0, 0],
    buttons: [{ pressed: false }, { pressed: false }, { pressed: true }]
  }
  assert.equal(gamepadAction(pad, bindings), 'accept')
  assert.equal(model.defaultArcadeControls().P1_BUTTON1.key, 'ControlLeft')
})
