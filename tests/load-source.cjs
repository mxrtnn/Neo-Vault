const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
function loadSource(file, replacements = {}, cache = new Map()) {
  const absolute = path.resolve(file)
  if (cache.has(absolute)) return cache.get(absolute).exports
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText
  const module = { exports: {} }
  cache.set(absolute, module)
  const localRequire = (name) => {
    if (Object.hasOwn(replacements, name)) return replacements[name]
    if (!name.startsWith('.')) return require(name)
    const target = path.resolve(path.dirname(absolute), name)
    if (fs.existsSync(target + '.ts')) return loadSource(target + '.ts', replacements, cache)
    return require(target)
  }
  new Function('require', 'module', 'exports', '__dirname', code)(
    localRequire,
    module,
    module.exports,
    path.dirname(absolute)
  )
  return module.exports
}
module.exports = { loadSource }
