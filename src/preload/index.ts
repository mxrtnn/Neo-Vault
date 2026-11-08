import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
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
