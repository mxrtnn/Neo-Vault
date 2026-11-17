import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import {
  arcadeControllerXml,
  defaultArcadeControls,
  validateArcadeControls,
  type ArcadeControls
} from '../shared/arcadeControls'
export function controlDirectory(root: string, profile: string): string {
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(profile)) throw new Error('Perfil no válido.')
  return join(root, 'data', 'profiles', profile, 'arcade-controls')
}
export async function readArcadeControls(root: string, profile: string): Promise<ArcadeControls> {
  await saveQueue.catch(() => {})
  try {
    return validateArcadeControls(
      JSON.parse(await readFile(join(controlDirectory(root, profile), 'controls.json'), 'utf8'))
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return defaultArcadeControls()
    throw error
  }
}
let saveQueue: Promise<unknown> = Promise.resolve()
export function saveArcadeControls(
  root: string,
  profile: string,
  value: unknown
): Promise<ArcadeControls> {
  const controls = validateArcadeControls(value)
  const task = saveQueue
    .catch(() => {})
    .then(async () => {
      const directory = controlDirectory(root, profile)
      await mkdir(directory, { recursive: true })
      await writeFile(
        join(directory, 'controls.json.tmp'),
        JSON.stringify(controls, null, 2),
        'utf8'
      )
      await rename(join(directory, 'controls.json.tmp'), join(directory, 'controls.json'))
      return controls
    })
  saveQueue = task
  return task
}
export const pauseOverlay = `
-- Drawn inside MAME, not over a still-running external game.
emu.register_frame_done(function()
  local machine = manager.machine
  if machine.paused and not manager.ui.menu_active then
    local ui = machine.render.ui_container
    ui:draw_box(0.30, 0.40, 0.70, 0.60, 0xffff3269, 0xee10121f)
    ui:draw_text("center", 0.45, "PAUSA", 0xffffffff, 0x00000000)
  end
end)
`
export async function prepareArcadeControls(root: string, profile: string): Promise<string[]> {
  const directory = controlDirectory(root, profile)
  const controls = await readArcadeControls(root, profile)
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'neovault.cfg'), arcadeControllerXml(controls), 'utf8')
  await writeFile(join(directory, 'pause.lua'), pauseOverlay, 'utf8')
  return [
    '-ctrlrpath',
    directory,
    '-ctrlr',
    'neovault',
    '-pause_brightness',
    '0.35',
    '-autoboot_delay',
    '0',
    '-autoboot_script',
    join(directory, 'pause.lua')
  ]
}
