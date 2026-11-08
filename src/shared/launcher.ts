export type PlayableSystem = 'nes' | 'snes'
export interface LauncherConfig {
  retroarchPath: string
  cores: Partial<Record<PlayableSystem, string>>
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
  chooseCore: (system: PlayableSystem) => Promise<LauncherConfig | null>
  chooseGame: (system: PlayableSystem, title: string) => Promise<LauncherConfig | null>
  importGame: (system: PlayableSystem) => Promise<{ config: LauncherConfig; title: string } | null>
  launch: (system: PlayableSystem, title: string, profileId: string) => Promise<LauncherResult>
  onEvent: (callback: (event: LauncherEvent) => void) => () => void
}
