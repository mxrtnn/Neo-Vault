import { basename, dirname, extname, join } from 'node:path'
import { readdir } from 'node:fs/promises'
import { arcadeById, arcadeByTitle, type ArcadeGame } from '../shared/arcade'
export function requireArcadeGame(title: string): ArcadeGame {
  const game = arcadeByTitle.get(title)
  if (!game || !/^[a-z0-9_]{1,64}$/.test(game.id))
    throw new Error('El título no pertenece al catálogo MAME 0.289.')
  return game
}
export function arcadeFileTitle(file: string): string {
  const id = basename(file, extname(file)).toLowerCase()
  const game = arcadeById.get(id)
  if (!game || !['.zip', '.7z'].includes(extname(file).toLowerCase()))
    throw new Error(
      'El nombre del archivo debe coincidir con el set MAME, por ejemplo gridlee.zip. Usa Añadir carpeta para importar varios.'
    )
  return game.title
}
export function arcadeRomPaths(paths: string[]): string[] {
  const unique = [...new Set(paths)]
  if (
    unique.length > 128 ||
    unique.join(';').length > 16000 ||
    unique.some((path) => /[;\0\r\n]/.test(path))
  )
    throw new Error(
      'Demasiadas rutas de ROMs o una carpeta contiene un punto y coma. Selecciona una carpeta más específica.'
    )
  return unique
}
export function arcadeLaunchArgs(game: ArcadeGame, paths: string[], directory: string): string[] {
  return [
    game.id,
    '-noreadconfig',
    '-noplugins',
    '-nowindow',
    '-skip_gameinfo',
    '-joystick',
    '-rompath',
    arcadeRomPaths(paths).join(';'),
    '-cfg_directory',
    join(directory, 'cfg'),
    '-nvram_directory',
    join(directory, 'nvram'),
    '-state_directory',
    join(directory, 'states'),
    '-input_directory',
    join(directory, 'inp'),
    '-snapshot_directory',
    join(directory, 'snap'),
    '-diff_directory',
    join(directory, 'diff'),
    '-inipath',
    join(directory, 'ini')
  ]
}
export async function scanArcadeFolder(
  root: string
): Promise<{
  bindings: Record<string, string>
  paths: string[]
  matched: number
  ignored: number
}> {
  const bindings: Record<string, string> = {}
  const paths = new Set<string>()
  let ignored = 0
  let inspected = 0
  async function scan(directory: string, depth: number): Promise<void> {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    for (const entry of entries) {
      if (++inspected > 30000)
        throw new Error(
          'La carpeta contiene demasiados elementos. Elige una carpeta específica de ROMs arcade.'
        )
      if (entry.isSymbolicLink()) continue
      const file = join(directory, entry.name)
      if (entry.isDirectory() && depth < 3) {
        await scan(file, depth + 1)
        continue
      }
      if (!entry.isFile() || !['.zip', '.7z'].includes(extname(entry.name).toLowerCase())) continue
      try {
        const title = arcadeFileTitle(file)
        const key = `arcade:${title}`
        if (!bindings[key]) bindings[key] = file
        paths.add(dirname(file))
      } catch {
        ignored++
      }
    }
  }
  await scan(root, 0)
  return {
    bindings,
    paths: arcadeRomPaths([root, ...paths]),
    matched: Object.keys(bindings).length,
    ignored
  }
}
