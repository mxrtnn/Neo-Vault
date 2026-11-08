import type { LauncherAPI } from '../shared/launcher'
import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      launcher: LauncherAPI
      getFullscreen: () => Promise<boolean>
      setFullscreen: (fullscreen: boolean) => Promise<boolean>
      onFullscreenChanged: (callback: (fullscreen: boolean) => void) => () => void
    }
  }
}
