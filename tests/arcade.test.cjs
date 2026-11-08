const { test } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs/promises')
const path = require('node:path')
const { loadSource } = require('./load-source.cjs')
const plan = loadSource('src/main/arcadePlan.ts')
test('arcade catalog validates machine identity and keeps paths out of command strings', () => {
  const pong = plan.requireArcadeGame('Pong (Rev E)')
  assert.equal(pong.id, 'pong')
  assert.equal(pong.romless, true)
  assert.throws(() => plan.requireArcadeGame('-help'))
  assert.throws(() => plan.arcadeRomPaths(['C:/one;C:/two']))
  assert.throws(() => plan.arcadeFileTitle('gridlee.exe'))
  assert.equal(plan.arcadeFileTitle('C:/games/gridlee.zip'), 'Gridlee')
  const args = plan.arcadeLaunchArgs(pong, ['C:/My Games'], 'C:/profiles/player-1')
  assert.equal(args[0], 'pong')
  assert.equal(args[args.indexOf('-rompath') + 1], 'C:/My Games')
})
test('one folder imports multiple sets, rejects unknown files and keeps archives intact', async () => {
  await fs.mkdir('work', { recursive: true })
  const root = await fs.mkdtemp(path.resolve('work/arcade-import-'))
  await fs.mkdir(path.join(root, 'nested'))
  await fs.writeFile(path.join(root, 'gridlee.zip'), 'archive fixture')
  await fs.writeFile(path.join(root, 'nested', 'robby.7z'), 'archive fixture')
  await fs.writeFile(path.join(root, 'unknown.zip'), 'unmatched')
  await fs.writeFile(path.join(root, 'readme.txt'), 'not a game')
  const result = await plan.scanArcadeFolder(root)
  assert.equal(result.matched, 2)
  assert.equal(result.ignored, 1)
  assert.equal(result.bindings['arcade:Gridlee'], path.join(root, 'gridlee.zip'))
  assert.equal(await fs.readFile(path.join(root, 'gridlee.zip'), 'utf8'), 'archive fixture')
})
test('audit reports missing dependencies and uses a separate process without shell', async () => {
  let call
  let code = 2
  const { runMameAudit } = loadSource('src/main/arcade.ts', {
    electron: {},
    'node:child_process': {
      spawn: (exe, args, options) => {
        call = { exe, args, options }
        const child = new EventEmitter()
        child.stdout = new EventEmitter()
        child.stderr = new EventEmitter()
        child.kill = () => {}
        setImmediate(() => {
          child.stderr.emit('data', Buffer.from('missing parent ROM'))
          child.emit('close', code)
        })
        return child
      }
    }
  })
  const failed = await runMameAudit('C:/mame.exe', 'gridlee', ['C:/Games'])
  assert.equal(failed.ok, false)
  assert.match(failed.message, /missing parent ROM/)
  assert.equal(call.options.shell, false)
  assert.ok(call.args.includes('-verifyroms'))
  code = 0
  assert.equal((await runMameAudit('C:/mame.exe', 'gridlee', ['C:/Games'])).ok, true)
  assert.equal((await runMameAudit('C:/mame.exe', null, ['C:/Games'])).ok, true)
  assert.equal(call.args[call.args.indexOf('-verifyroms') + 1], '-rompath')
})
