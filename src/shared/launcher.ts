export type RetroSystem = 'nes' | 'snes'
export type PlayableSystem = RetroSystem | 'arcade'
export interface LauncherConfig {
  retroarchPath: string
  cores: Partial<Record<RetroSystem, string>>
  mamePath?: string
  arcadeRomPaths?: string[]
  bindings: Record<string, string>
}
export interface LauncherEvent {
  status: 'running' | 'stopped' | 'error'
  message: string
}
export interface LauncherResult {
  ok: boolean
  message: string
}
export interface LauncherAPI {
  getConfig: () => Promise<LauncherConfig>
  chooseRetroarch: () => Promise<LauncherConfig | null>
  chooseCore: (system: RetroSystem) => Promise<LauncherConfig | null>
  chooseMame: () => Promise<LauncherConfig | null>
  importArcadeFolder: () => Promise<{
    config: LauncherConfig
    matched: number
    ignored: number
    message: string
  } | null>
  auditArcade: (title?: string) => Promise<LauncherResult>
  openArcadeSource: (title: string) => Promise<LauncherResult>
  chooseGame: (system: PlayableSystem, title: string) => Promise<LauncherConfig | null>
  importGame: (system: PlayableSystem) => Promise<{ config: LauncherConfig; title: string } | null>
  launch: (system: PlayableSystem, title: string, profileId: string) => Promise<LauncherResult>
  onEvent: (callback: (event: LauncherEvent) => void) => () => void
}
