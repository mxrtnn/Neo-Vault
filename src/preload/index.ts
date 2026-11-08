import { contextBridge, ipcRenderer } from 'electron'
import type { LauncherAPI, LauncherEvent } from '../shared/launcher'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const launcher: LauncherAPI = {
  chooseMame: () => ipcRenderer.invoke('launcher:mame'),
  importArcadeFolder: () => ipcRenderer.invoke('launcher:arcade-folder'),
  auditArcade: (title) => ipcRenderer.invoke('launcher:arcade-audit', title),
  openArcadeSource: (title) => ipcRenderer.invoke('launcher:arcade-source', title),
  getConfig: () => ipcRenderer.invoke('launcher:config'),
  chooseRetroarch: () => ipcRenderer.invoke('launcher:retroarch'),
  chooseCore: (system) => ipcRenderer.invoke('launcher:core', system),
  chooseGame: (system, title) => ipcRenderer.invoke('launcher:game', system, title),
  importGame: (system) => ipcRenderer.invoke('launcher:import', system),
  launch: (system, title, profileId) =>
    ipcRenderer.invoke('launcher:launch', system, title, profileId),
  onEvent: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, value: LauncherEvent): void =>
      callback(value)
    ipcRenderer.on('launcher:event', listener)
    return () => {
      ipcRenderer.removeListener('launcher:event', listener)
    }
  }
}
const api = {
  launcher,
  getFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:get-fullscreen'),
  setFullscreen: (fullscreen: boolean): Promise<boolean> =>
    ipcRenderer.invoke('window:set-fullscreen', fullscreen),
  onFullscreenChanged: (callback: (fullscreen: boolean) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, value: boolean): void => callback(value)
    ipcRenderer.on('window:fullscreen-changed', listener)
    return () => {
      ipcRenderer.removeListener('window:fullscreen-changed', listener)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
