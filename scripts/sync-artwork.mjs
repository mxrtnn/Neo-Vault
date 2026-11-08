import { mkdir, writeFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const sources = {
  snes: 'Nintendo_-_Super_Nintendo_Entertainment_System',
  nes: 'Nintendo_-_Nintendo_Entertainment_System',
  n64: 'Nintendo_-_Nintendo_64',
  nds: 'Nintendo_-_Nintendo_DS',
  genesis: 'Sega_-_Mega_Drive_-_Genesis',
  atari: 'Atari_-_2600',
  ps1: 'Sony_-_PlayStation',
  gb: 'Nintendo_-_Game_Boy'
}
const selected = process.argv.includes('--snes') ? { snes: sources.snes } : sources
const output = fileURLToPath(new URL('../src/renderer/src/assets/media/', import.meta.url))
await mkdir(output, { recursive: true })
for (const [id, repository] of Object.entries(selected)) {
  if (
    !process.argv.includes('--force') &&
    (await access(`${output}${id}.json`).then(
      () => true,
      () => false
    ))
  ) {
    console.log(`${id}: índice existente conservado. Usa --force para actualizar.`)
    continue
  }
  async function getTree(ref) {
    const response = await fetch(
      `https://api.github.com/repos/libretro-thumbnails/${repository}/git/trees/${ref}`,
      {
        headers: { 'User-Agent': 'Neo-Vault-media-index', Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(60000)
      }
    )
    if (!response.ok) throw new Error(`${repository}: HTTP ${response.status}`)
    const tree = await response.json()
    if (tree.truncated || !Array.isArray(tree.tree))
      throw new Error(`${repository}: índice incompleto; no se reemplaza el archivo local.`)
    return tree
  }
  const root = await getTree('master')
  const games = Object.create(null)
  for (const [folder, kind] of Object.entries({
    Named_Boxarts: 'box',
    Named_Snaps: 'snap',
    Named_Titles: 'title'
  })) {
    const directory = root.tree.find((item) => item.type === 'tree' && item.path === folder)
    if (!directory) continue
    const tree = await getTree(directory.sha)
    for (const item of tree.tree) {
      const match = /^([^/]+)\.png$/.exec(item.path)
      if (item.type !== 'blob' || !match || match[1].length > 512) continue
      games[match[1]] ??= {}
      games[match[1]][kind] = true
    }
  }
  const manifest = { repository, commit: root.sha, fetchedAt: new Date().toISOString(), games }
  await writeFile(`${output}${id}.json`, JSON.stringify(manifest), 'utf8')
  console.log(`${id}: ${Object.keys(games).length} títulos con imágenes indexadas.`)
}
