const { test } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs/promises')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
function load(file, replacements = {}) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  const module = { exports: {} }
  const localRequire = (name) => {
    if (Object.hasOwn(replacements, name)) return replacements[name]
    if (name.startsWith('.'))
      return require('./load-source.cjs').loadSource(
        path.resolve(path.dirname(file), name) + '.ts',
        replacements
      )
    return require(name)
  }
  new Function('require', 'module', 'exports', '__dirname', code)(
    localRequire,
    module,
    module.exports,
    path.dirname(path.resolve(file))
  )
  return module.exports
}
const plan = load('src/main/launchPlan.ts')
test('save isolation and configuration escaping', () => {
  assert.throws(() => plan.profileGameDirectory('data', '../escape', 'nes', 'Demo'))
  assert.throws(() => plan.configPath('bad"\nconfig'))
  assert.throws(() => plan.validateSelection('ps1', 'Demo'))
  assert.throws(() => plan.validateGamePath('nes', 'demo.sfc'))
  assert.notEqual(
    plan.profileGameDirectory('data', 'one', 'nes', 'Demo'),
    plan.profileGameDirectory('data', 'two', 'nes', 'Demo')
  )
  assert.notEqual(
    plan.profileGameDirectory('data', 'one', 'nes', 'Demo'),
    plan.profileGameDirectory('data', 'one', 'nes', 'Other')
  )
  assert.equal(plan.configPath('C:\\Neo Vault\\partidas'), '"C:/Neo Vault/partidas"')
})
test('launcher persists choices, handles cancellation, launches without shell and restores window', async () => {
  await fs.mkdir(path.resolve('work'), { recursive: true })
  const root = await fs.mkdtemp(path.resolve('work/launcher-check-'))
  const handlers = new Map()
  const notices = []
  const window = {
    isDestroyed: () => false,
    hide: () => {
      window.hidden = true
    },
    show: () => {
      window.hidden = false
    },
    focus: () => {},
    webContents: { send: (_, data) => notices.push(data) }
  }
  const frame = {}
  const event = { sender: { mainFrame: frame }, senderFrame: frame }
  let nextFile = null
  let spawned
  let child
  let failSpawn = false
  const fakeElectron = {
    app: { isPackaged: true, getPath: () => path.join(root, 'NeoVault.exe') },
    BrowserWindow: { fromWebContents: () => window },
    dialog: {
      showOpenDialog: async () => ({ canceled: !nextFile, filePaths: nextFile ? [nextFile] : [] })
    },
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) }
  }
  const fakeProcess = {
    spawn: (exe, args, options) => {
      spawned = { exe, args, options }
      child = new EventEmitter()
      child.stderr = new EventEmitter()
      setImmediate(() =>
        failSpawn ? child.emit('error', new Error('spawn failure')) : child.emit('spawn')
      )
      return child
    }
  }
  const { registerLauncher } = load('src/main/launcher.ts', {
    electron: fakeElectron,
    'node:child_process': fakeProcess,
    './launchPlan': plan
  })
  registerLauncher()
  const invoke = (name, ...args) => handlers.get('launcher:' + name)(event, ...args)
  assert.equal((await invoke('config')).retroarchPath, '')
  assert.equal(await invoke('retroarch'), null)
  const files = [
    'retroarch.exe',
    'fceumm_libretro.dll',
    'snes9x_libretro.dll',
    'Demo con espacios.nes',
    'Demo.sfc',
    'wrong.dll'
  ]
  for (const file of files) await fs.writeFile(path.join(root, file), 'fixture')
  nextFile = path.join(root, 'retroarch.exe')
  await invoke('retroarch')
  nextFile = path.join(root, 'wrong.dll')
  await assert.rejects(invoke('core', 'nes'))
  nextFile = path.join(root, 'fceumm_libretro.dll')
  await invoke('core', 'nes')
  nextFile = path.join(root, 'Demo.sfc')
  await assert.rejects(invoke('game', 'nes', 'Demo'))
  nextFile = path.join(root, 'Demo con espacios.nes')
  const imported = await invoke('import', 'nes')
  assert.equal(imported.title, 'Demo con espacios')
  assert.equal(imported.config.bindings['nes:Demo con espacios'], nextFile)
  nextFile = null
  assert.equal(await invoke('game', 'nes', 'Demo con espacios'), null)
  const invalid = await invoke('launch', 'nes', 'Demo con espacios', '../escape')
  assert.equal(invalid.ok, false)
  const started = invoke('launch', 'nes', 'Demo con espacios', 'player-1')
  assert.equal((await invoke('launch', 'nes', 'Demo con espacios', 'player-1')).ok, false)
  assert.equal((await started).ok, true)
  assert.equal(spawned.options.shell, false)
  assert.equal(spawned.args.at(-1), path.join(root, 'Demo con espacios.nes'))
  assert.equal(window.hidden, true)
  const firstConfig = spawned.args[1]
  const config = await fs.readFile(firstConfig, 'utf8')
  assert.match(config, /savefile_directory/)
  assert.match(config, /auto_overrides_enable = "false"/)
  const firstSave = path.join(path.dirname(firstConfig), 'saves', 'Demo.srm')
  await fs.writeFile(firstSave, 'existing save')
  child.emit('close', 0)
  assert.equal(window.hidden, false)
  assert.equal(notices.at(-1).status, 'stopped')
  assert.equal((await invoke('launch', 'nes', 'Demo con espacios', 'player-2')).ok, true)
  assert.notEqual(firstConfig, spawned.args[1])
  assert.equal(await fs.readFile(firstSave, 'utf8'), 'existing save')
  child.stderr.emit('data', 'Core failed')
  child.emit('close', 1)
  assert.equal(window.hidden, false)
  assert.equal(notices.at(-1).status, 'error')
  assert.match(notices.at(-1).message, /Core failed/)
  failSpawn = true
  assert.equal((await invoke('launch', 'nes', 'Demo con espacios', 'player-1')).ok, false)
  assert.equal(window.hidden, false)
  const configFile = path.join(root, 'data', 'launcher.json')
  const included = path.join(root, 'runtime', 'retroarch')
  await fs.mkdir(path.join(included, 'cores'), { recursive: true })
  await fs.writeFile(path.join(included, 'retroarch.exe'), 'fixture')
  await fs.writeFile(path.join(included, 'cores', 'snes9x_libretro.dll'), 'fixture')
  await fs.writeFile(configFile, JSON.stringify({ retroarchPath: '', cores: {}, bindings: {} }))
  const detected = await invoke('config')
  assert.equal(detected.retroarchPath, path.join(included, 'retroarch.exe'))
  assert.equal(detected.cores.snes, path.join(included, 'cores', 'snes9x_libretro.dll'))
  const mameRoot = path.join(root, 'runtime', 'mame')
  await fs.mkdir(mameRoot, { recursive: true })
  await fs.writeFile(path.join(mameRoot, 'mame.exe'), 'fixture')
  assert.equal((await invoke('config')).mamePath, path.join(mameRoot, 'mame.exe'))
  failSpawn = false
  assert.equal((await invoke('launch', 'arcade', 'Pong (Rev E)', 'player-1')).ok, true)
  assert.equal(spawned.args[0], 'pong')
  assert.ok(spawned.args.includes('-nvram_directory'))
  child.emit('close', 0)
  assert.equal(window.hidden, false)
  await fs.writeFile(configFile, '{invalid')
  nextFile = path.join(root, 'fceumm_libretro.dll')
  await assert.rejects(invoke('core', 'nes'))
  assert.equal(await fs.readFile(configFile, 'utf8'), '{invalid')
  await assert.rejects(handlers.get('launcher:config')({ sender: event.sender, senderFrame: {} }))
})
