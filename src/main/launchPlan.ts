import { createHash } from 'node:crypto'
import { extname, join } from 'node:path'
import type { PlayableSystem } from '../shared/launcher'
export const coreNames: Record<PlayableSystem, string> = {
  nes: 'fceumm_libretro.dll',
  snes: 'snes9x_libretro.dll'
}
export const gameExtensions: Record<PlayableSystem, string[]> = {
  nes: ['nes'],
  snes: ['sfc', 'smc']
}
export function validateSelection(
  system: unknown,
  title: unknown
): asserts system is PlayableSystem {
  if (system !== 'nes' && system !== 'snes')
    throw new Error('La primera integración admite NES y SNES.')
  if (typeof title !== 'string' || !title.trim() || title.length > 512 || /[\0\r\n]/.test(title))
    throw new Error('Título de juego no válido.')
}
export function bindingKey(system: PlayableSystem, title: string): string {
  return `${system}:${title}`
}
export function validateGamePath(system: PlayableSystem, file: string): void {
  if (!gameExtensions[system].includes(extname(file).slice(1).toLowerCase()))
    throw new Error('El archivo no corresponde a esta consola. Usa un juego sin comprimir.')
}
export function profileGameDirectory(
  root: string,
  profile: string,
  system: PlayableSystem,
  title: string
): string {
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(profile)) throw new Error('Identificador de perfil no válido.')
  const gameId = createHash('sha256').update(bindingKey(system, title)).digest('hex').slice(0, 20)
  return join(root, 'profiles', profile, system, gameId)
}
export function configPath(value: string): string {
  if (/["\0\r\n]/.test(value)) throw new Error('La ruta contiene caracteres no compatibles.')
  return `"${value.replaceAll('\\', '/')}"`
}
export function sessionConfig(directory: string, runtimeRoot: string): string {
  return (
    [
      `savefile_directory = ${configPath(join(directory, 'saves'))}`,
      `savestate_directory = ${configPath(join(directory, 'states'))}`,
      `core_options_path = ${configPath(join(directory, 'core-options.cfg'))}`,
      `system_directory = ${configPath(join(runtimeRoot, 'system'))}`,
      `joypad_autoconfig_dir = ${configPath(join(runtimeRoot, 'autoconfig'))}`,
      `assets_directory = ${configPath(join(runtimeRoot, 'assets'))}`,
      `libretro_info_path = ${configPath(join(runtimeRoot, 'info'))}`,
      'config_save_on_exit = "false"',
      'auto_overrides_enable = "false"',
      'savefiles_in_content_dir = "false"',
      'savestates_in_content_dir = "false"',
      'savestate_auto_save = "false"',
      'savestate_auto_load = "false"',
      'input_exit_emulator = "escape"',
      'video_fullscreen = "true"'
    ].join('\n') + '\n'
  )
}
