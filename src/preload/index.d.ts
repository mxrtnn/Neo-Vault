import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getFullscreen: () => Promise<boolean>
      setFullscreen: (fullscreen: boolean) => Promise<boolean>
      onFullscreenChanged: (callback: (fullscreen: boolean) => void) => () => void
    }
  }
}
