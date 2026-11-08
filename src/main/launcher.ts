import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { spawn } from 'node:child_process'
import { mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import type {
  LauncherConfig,
  LauncherEvent,
  LauncherResult,
  PlayableSystem
} from '../shared/launcher'
import {
  bindingKey,
  coreNames,
  gameExtensions,
  profileGameDirectory,
  sessionConfig,
  validateGamePath,
  validateSelection
} from './launchPlan'
let running = false
let pending = false
const empty = (): LauncherConfig => ({ retroarchPath: '', cores: {}, bindings: {} })
export function registerLauncher(): void {
  const projectRoot = app.isPackaged ? dirname(app.getPath('exe')) : resolve(__dirname, '../..')
  const dataRoot = join(projectRoot, 'data')
  const configFile = join(dataRoot, 'launcher.json')
  const bundledRoot = join(projectRoot, 'runtime', 'retroarch')
  async function withBundled(config: LauncherConfig): Promise<LauncherConfig> {
    const executable = join(bundledRoot, 'retroarch.exe')
    const snesCore = join(bundledRoot, 'cores', 'snes9x_libretro.dll')
    const exists = async (file: string): Promise<boolean> =>
      stat(file).then(
        (value) => value.isFile(),
        () => false
      )
    return {
      ...config,
      retroarchPath: config.retroarchPath || ((await exists(executable)) ? executable : ''),
      cores: {
        ...config.cores,
        snes: config.cores.snes || ((await exists(snesCore)) ? snesCore : undefined)
      }
    }
  }
  let queue: Promise<unknown> = Promise.resolve()
  async function load(): Promise<LauncherConfig> {
    try {
      const data = JSON.parse(await readFile(configFile, 'utf8')) as LauncherConfig
      if (
        typeof data.retroarchPath !== 'string' ||
        !data.cores ||
        !data.bindings ||
        typeof data.cores !== 'object' ||
        typeof data.bindings !== 'object' ||
        Array.isArray(data.cores) ||
        Array.isArray(data.bindings) ||
        !Object.values(data.cores).every((v) => typeof v === 'string') ||
        !Object.values(data.bindings).every((v) => typeof v === 'string')
      )
        throw new Error(
          'Configuración de emulación no válida. Conserva data/launcher.json para revisarla antes de reemplazarla.'
        )
      return withBundled(data)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return withBundled(empty())
      throw error
    }
  }
  async function update(
    mutator: (config: LauncherConfig) => LauncherConfig
  ): Promise<LauncherConfig> {
    const task = queue
      .catch(() => {})
      .then(async () => {
        const config = mutator(await load())
        await mkdir(dataRoot, { recursive: true })
        await writeFile(`${configFile}.tmp`, JSON.stringify(config, null, 2), 'utf8')
        await rename(`${configFile}.tmp`, configFile)
        return config
      })
    queue = task
    return task
  }
  function windowFor(event: IpcMainInvokeEvent): BrowserWindow {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window || event.senderFrame !== event.sender.mainFrame)
      throw new Error('Ventana no autorizada.')
    return window
  }
  async function fileExists(file: string): Promise<string> {
    const path = await realpath(file)
    if (!(await stat(path)).isFile()) throw new Error('La ruta no corresponde a un archivo.')
    return path
  }
  function notify(window: BrowserWindow, event: LauncherEvent): void {
    if (!window.isDestroyed()) window.webContents.send('launcher:event', event)
  }
  ipcMain.handle('launcher:config', async (event) => {
    windowFor(event)
    await queue.catch(() => {})
    return load()
  })
  ipcMain.handle('launcher:retroarch', async (event) => {
    const window = windowFor(event)
    const selection = await dialog.showOpenDialog(window, {
      title: 'Selecciona retroarch.exe',
      properties: ['openFile'],
      filters: [{ name: 'RetroArch', extensions: ['exe'] }]
    })
    if (selection.canceled) return null
    const file = await fileExists(selection.filePaths[0])
    if (basename(file).toLowerCase() !== 'retroarch.exe')
      throw new Error('Selecciona el ejecutable oficial retroarch.exe.')
    return update((c) => ({ ...c, retroarchPath: file }))
  })
  ipcMain.handle('launcher:core', async (event, system: PlayableSystem) => {
    const window = windowFor(event)
    validateSelection(system, 'core')
    const selection = await dialog.showOpenDialog(window, {
      title: `Selecciona ${coreNames[system]}`,
      properties: ['openFile'],
      filters: [{ name: coreNames[system], extensions: ['dll'] }]
    })
    if (selection.canceled) return null
    const file = await fileExists(selection.filePaths[0])
    if (basename(file).toLowerCase() !== coreNames[system])
      throw new Error(`Este sistema requiere ${coreNames[system]}.`)
    return update((c) => ({ ...c, cores: { ...c.cores, [system]: file } }))
  })
  ipcMain.handle('launcher:game', async (event, system: PlayableSystem, title: string) => {
    const window = windowFor(event)
    validateSelection(system, title)
    const selection = await dialog.showOpenDialog(window, {
      title: `Asociar archivo a ${title}`,
      properties: ['openFile'],
      filters: [{ name: system.toUpperCase(), extensions: gameExtensions[system] }]
    })
    if (selection.canceled) return null
    const file = await fileExists(selection.filePaths[0])
    validateGamePath(system, file)
    return update((c) => ({ ...c, bindings: { ...c.bindings, [bindingKey(system, title)]: file } }))
  })
  ipcMain.handle('launcher:import', async (event, system: PlayableSystem) => {
    const window = windowFor(event)
    validateSelection(system, 'import')
    const selection = await dialog.showOpenDialog(window, {
      title: 'Importar un juego local',
      properties: ['openFile'],
      filters: [{ name: system.toUpperCase(), extensions: gameExtensions[system] }]
    })
    if (selection.canceled) return null
    const file = await fileExists(selection.filePaths[0])
    validateGamePath(system, file)
    const title = basename(file).replace(/\.(nes|sfc|smc)$/i, '')
    validateSelection(system, title)
    const config = await update((c) => ({
      ...c,
      bindings: { ...c.bindings, [bindingKey(system, title)]: file }
    }))
    return { config, title }
  })
  ipcMain.handle(
    'launcher:launch',
    async (
      event,
      system: PlayableSystem,
      title: string,
      profileId: string
    ): Promise<LauncherResult> => {
      const window = windowFor(event)
      if (pending || running)
        return { ok: false, message: 'Ya hay un juego iniciándose o en ejecución.' }
      pending = true
      try {
        validateSelection(system, title)
        const config = await load()
        const game = config.bindings[bindingKey(system, title)]
        const core = config.cores[system]
        if (!config.retroarchPath || !core)
          throw new Error('Selecciona RetroArch y el núcleo de esta consola en Configuración.')
        if (!game) throw new Error('Primero asocia un archivo local a este título.')
        const executable = await fileExists(config.retroarchPath)
        const coreFile = await fileExists(core)
        const gameFile = await fileExists(game)
        if (
          basename(executable).toLowerCase() !== 'retroarch.exe' ||
          basename(coreFile).toLowerCase() !== coreNames[system]
        )
          throw new Error('La configuración del ejecutable o núcleo no corresponde a este sistema.')
        validateGamePath(system, gameFile)
        const directory = profileGameDirectory(dataRoot, profileId, system, title)
        await mkdir(join(directory, 'saves'), { recursive: true })
        await mkdir(join(directory, 'states'), { recursive: true })
        const session = join(directory, 'retroarch.cfg')
        await writeFile(session, sessionConfig(directory, dirname(executable)), 'utf8')
        return await new Promise<LauncherResult>((resolveResult) => {
          const child = spawn(
            executable,
            ['--config', session, '--fullscreen', '-L', coreFile, gameFile],
            { shell: false, cwd: dirname(executable), stdio: ['ignore', 'ignore', 'pipe'] }
          )
          let stderr = ''
          let started = false
          child.stderr?.on('data', (data) => {
            stderr = (stderr + String(data)).slice(-1500)
          })
          child.once('spawn', () => {
            started = true
            running = true
            pending = false
            notify(window, { status: 'running', message: `Jugando: ${title}` })
            if (!window.isDestroyed()) window.hide()
            resolveResult({
              ok: true,
              message:
                'RetroArch iniciado. Cierra RetroArch o presiona Esc para volver a Neo-Vault.'
            })
          })
          child.once('error', () => {
            pending = false
            running = false
            notify(window, {
              status: 'error',
              message: 'No se pudo ejecutar RetroArch. Comprueba la instalación y sus dependencias.'
            })
            if (!window.isDestroyed()) {
              window.show()
              window.focus()
            }
            resolveResult({ ok: false, message: 'No se pudo iniciar RetroArch.' })
          })
          child.once('close', (code) => {
            running = false
            pending = false
            if (!started) return
            notify(window, {
              status: code === 0 ? 'stopped' : 'error',
              message:
                code === 0
                  ? 'Partida finalizada. Tus guardados permanecen en la carpeta del perfil.'
                  : `RetroArch terminó con un error (${code}). ${stderr}`
            })
            if (!window.isDestroyed()) {
              window.show()
              window.focus()
            }
          })
        })
      } catch (error) {
        pending = false
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'No se pudo iniciar el juego.'
        }
      }
    }
  )
}
