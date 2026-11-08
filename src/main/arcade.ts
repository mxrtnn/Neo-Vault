import { BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { spawn } from 'node:child_process'
import { mkdir, realpath, stat } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { LauncherConfig, LauncherResult } from '../shared/launcher'
import { officialArcadePages } from '../shared/arcade'
import { arcadeLaunchArgs, arcadeRomPaths, requireArcadeGame, scanArcadeFolder } from './arcadePlan'
import { profileGameDirectory } from './launchPlan'
export interface ArcadeContext {
  projectRoot: string
  load: () => Promise<LauncherConfig>
  update: (mutator: (config: LauncherConfig) => LauncherConfig) => Promise<LauncherConfig>
  windowFor: (event: IpcMainInvokeEvent) => BrowserWindow
  isBusy: () => boolean
}
async function executableFor(config: LauncherConfig): Promise<string> {
  if (!config.mamePath)
    throw new Error('MAME no está preparado. Ejecuta npm run setup:mame y reinicia Neo-Vault.')
  const executable = await realpath(config.mamePath)
  if (basename(executable).toLowerCase() !== 'mame.exe' || !(await stat(executable)).isFile())
    throw new Error('Selecciona el ejecutable oficial mame.exe.')
  return executable
}
export function runMameAudit(
  executable: string,
  id: string | null,
  paths: string[]
): Promise<LauncherResult> {
  return new Promise((resolve) => {
    const child = spawn(
      executable,
      [
        '-noreadconfig',
        '-noplugins',
        '-verifyroms',
        ...(id ? [id] : []),
        '-rompath',
        arcadeRomPaths(paths).join(';')
      ],
      {
        cwd: dirname(executable),
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
    let output = ''
    let done = false
    const finish = (result: LauncherResult): void => {
      if (done) return
      done = true
      clearTimeout(timeout)
      resolve(result)
    }
    const timeout = setTimeout(() => {
      child.kill()
      finish({
        ok: false,
        message: 'La auditoría superó 45 segundos. Revisa el set o sus dependencias.'
      })
    }, 45000)
    const read = (data: Buffer): void => {
      output = (output + String(data)).slice(-4000)
    }
    child.stdout?.on('data', read)
    child.stderr?.on('data', read)
    child.once('error', () =>
      finish({
        ok: false,
        message: 'Windows no pudo iniciar MAME. Revisa la instalación y los requisitos de CPU.'
      })
    )
    child.once('close', (code) =>
      finish({
        ok: code === 0,
        message:
          code === 0
            ? 'Verificación correcta para MAME 0.289.'
            : `Faltan archivos o no coinciden con MAME 0.289. ${output}`
      })
    )
  })
}
export async function prepareArcadeLaunch(
  context: Pick<ArcadeContext, 'projectRoot' | 'load'>,
  title: string,
  profile: string
): Promise<{ executable: string; args: string[]; cwd: string }> {
  const game = requireArcadeGame(title)
  if (game.status === 'preliminary')
    throw new Error(
      'Este set está marcado como preliminar por MAME; no se ofrece como listo para jugar.'
    )
  const config = await context.load()
  const executable = await executableFor(config)
  const file = config.bindings[`arcade:${title}`]
  if (!game.romless && !file)
    throw new Error('Añade tu carpeta de ROMs arcade para detectar este set.')
  if (file && !(await stat(file)).isFile())
    throw new Error('El archivo asociado ya no está disponible.')
  const root = join(context.projectRoot, 'data', 'arcade', 'roms')
  const paths = arcadeRomPaths([
    root,
    ...(file ? [dirname(file)] : []),
    ...(config.arcadeRomPaths ?? [])
  ])
  const directory = profileGameDirectory(
    join(context.projectRoot, 'data'),
    profile,
    'arcade',
    title
  )
  if (!game.romless) {
    const audit = await runMameAudit(executable, game.id, paths)
    if (!audit.ok) throw new Error(audit.message)
  }
  for (const folder of ['cfg', 'nvram', 'states', 'inp', 'snap', 'diff', 'ini'])
    await mkdir(join(directory, folder), { recursive: true })
  return { executable, args: arcadeLaunchArgs(game, paths, directory), cwd: dirname(executable) }
}
export function registerArcade(context: ArcadeContext): () => boolean {
  let auditing = false
  ipcMain.handle('launcher:mame', async (event) => {
    const window = context.windowFor(event)
    const selected = await dialog.showOpenDialog(window, {
      title: 'Selecciona mame.exe (0.289)',
      properties: ['openFile'],
      filters: [{ name: 'MAME', extensions: ['exe'] }]
    })
    if (selected.canceled) return null
    const file = await realpath(selected.filePaths[0])
    if (basename(file).toLowerCase() !== 'mame.exe' || !(await stat(file)).isFile())
      throw new Error('Selecciona mame.exe.')
    return context.update((config) => ({ ...config, mamePath: file }))
  })
  ipcMain.handle('launcher:arcade-folder', async (event) => {
    const window = context.windowFor(event)
    const selected = await dialog.showOpenDialog(window, {
      title: 'Selecciona tu carpeta de ROMs arcade (.zip / .7z)',
      properties: ['openDirectory']
    })
    if (selected.canceled) return null
    const root = await realpath(selected.filePaths[0])
    const scanned = await scanArcadeFolder(root)
    const config = await context.update((config) => ({
      ...config,
      bindings: { ...config.bindings, ...scanned.bindings },
      arcadeRomPaths: arcadeRomPaths([...scanned.paths, ...(config.arcadeRomPaths ?? [])])
    }))
    return {
      config,
      matched: scanned.matched,
      ignored: scanned.ignored,
      message: `${scanned.matched} sets detectados por nombre; ${scanned.ignored} archivos sin coincidencia. La auditoría comprobará su contenido antes de jugar.`
    }
  })
  ipcMain.handle('launcher:arcade-source', async (event, title: string) => {
    context.windowFor(event)
    const game = requireArcadeGame(title)
    const url = officialArcadePages[game.id]
    if (!url)
      return {
        ok: false,
        message: 'Este título no tiene una fuente oficial de descarga verificada en Neo-Vault.'
      }
    await shell.openExternal(url)
    return {
      ok: true,
      message:
        'Fuente oficial abierta. Revisa y acepta sus condiciones en la web. Después añade la carpeta de descarga; conserva el nombre del ZIP.'
    }
  })
  ipcMain.handle(
    'launcher:arcade-audit',
    async (event, title?: string): Promise<LauncherResult> => {
      context.windowFor(event)
      if (auditing || context.isBusy())
        return { ok: false, message: 'Espera a que finalice la operación actual.' }
      auditing = true
      try {
        const game = title ? requireArcadeGame(title) : null
        const config = await context.load()
        const executable = await executableFor(config)
        if (game?.romless)
          return {
            ok: true,
            message:
              'Este circuito no necesita ROMs externas. MAME está localizado; puedes pulsar Jugar.'
          }
        const file = title ? config.bindings[`arcade:${title}`] : undefined
        const installed = Object.entries(config.bindings)
          .filter(([key]) => key.startsWith('arcade:'))
          .map(([, file]) => dirname(file))
        if (!title && !installed.length)
          return { ok: false, message: 'Primero añade una carpeta con tus sets arcade.' }
        return await runMameAudit(
          executable,
          game?.id ?? null,
          arcadeRomPaths([
            join(context.projectRoot, 'data', 'arcade', 'roms'),
            ...(file ? [dirname(file)] : []),
            ...(config.arcadeRomPaths ?? []),
            ...(!title ? installed : [])
          ])
        )
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'No se pudo verificar el set.'
        }
      } finally {
        auditing = false
      }
    }
  )
  return () => auditing
}
