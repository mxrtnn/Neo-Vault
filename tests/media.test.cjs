const { test } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const { readFileSync } = require('node:fs')
const code = ts.transpileModule(readFileSync('src/renderer/src/mediaPlan.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText
const moduleExports = {}
new Function('exports', code)(moduleExports)
const { resolveMedia, cleanMediaName } = moduleExports
const manifest = {
  repository: 'Test',
  games: {
    'Super Mario World (USA)': { box: true, snap: true },
    'Super Mario World (Europe)': { box: true },
    'Super Mario World 2 (USA)': { snap: true }
  }
}
test('artwork matches exact edition before fallbacks', () => {
  const match = resolveMedia(manifest, 'Super Mario World (Europe)', 'box')
  assert.equal(match[0].name, 'Super Mario World (Europe)')
  assert.equal(match[0].alternative, false)
  assert.equal(match[0].kind, 'box')
})
test('missing revisions reuse only the same title and label the alternative edition', () => {
  const match = resolveMedia(manifest, 'Super Mario World (USA) (Rev 1)', 'snap')
  assert.equal(match[0].name, 'Super Mario World (USA)')
  assert.equal(match[0].alternative, true)
  assert.equal(match[1].kind, 'box')
  assert.deepEqual(resolveMedia(manifest, 'Unknown Game (USA)', 'box'), [])
  assert.equal(
    resolveMedia(manifest, 'Super Mario World 2 (USA)', 'box')[0].name,
    'Super Mario World 2 (USA)'
  )
  assert.equal(cleanMediaName('A: B & C?'), 'A_ B _ C_')
})
test('SNES index contains Mario cover and screenshot', () => {
  const snes = JSON.parse(readFileSync('src/renderer/src/assets/media/snes.json', 'utf8'))
  const images = resolveMedia(snes, 'Super Mario World (USA)', 'snap')
  assert.equal(images[0].kind, 'snap')
  assert.ok(images.some((image) => image.kind === 'box'))
  assert.ok(Object.keys(snes.games).length > 3000)
})
