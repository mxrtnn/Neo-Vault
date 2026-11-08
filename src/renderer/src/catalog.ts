export type CatalogSource = { folder: string; name: string }
export const catalogSources: Record<string, CatalogSource> = {
  arcade: { folder: 'mame', name: 'MAME 0.289' },
  snes: { folder: 'no-intro', name: 'Nintendo - Super Nintendo Entertainment System' },
  n64: { folder: 'no-intro', name: 'Nintendo - Nintendo 64' },
  nds: { folder: 'no-intro', name: 'Nintendo - Nintendo DS' },
  genesis: { folder: 'no-intro', name: 'Sega - Mega Drive - Genesis' },
  atari: { folder: 'no-intro', name: 'Atari - 2600' },
  ps1: { folder: 'redump', name: 'Sony - PlayStation' },
  nes: { folder: 'no-intro', name: 'Nintendo - Nintendo Entertainment System' },
  gb: { folder: 'no-intro', name: 'Nintendo - Game Boy' }
}
export function parseCatalog(text: string): string[] {
  return [
    ...new Set(
      Array.from(text.matchAll(/(?:^|\n)game\s*\(\s*\r?\n\s*name\s+"((?:\\.|[^"\\])*)"/g), (m) =>
        m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      )
    )
  ].sort((a, b) => a.localeCompare(b))
}
export async function fetchCatalog(id: string, signal: AbortSignal): Promise<string[]> {
  if (id === 'arcade') {
    const { arcadeGames } = await import('../../shared/arcade')
    return arcadeGames.map((game) => game.title)
  }
  const source = catalogSources[id]
  if (!source) throw new Error('Este sistema aún no tiene un proveedor de catálogo conectado.')
  const url = `https://raw.githubusercontent.com/libretro/libretro-database/master/metadat/${source.folder}/${encodeURIComponent(source.name)}.dat`
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`El proveedor respondió con el código ${response.status}.`)
  const games = parseCatalog(await response.text())
  if (!games.length)
    throw new Error('El proveedor devolvió una lista vacía o un formato no reconocido.')
  return games
}
