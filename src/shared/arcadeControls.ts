export const arcadeActions = [
  ['P1_JOYSTICK_UP', 'Arriba'],
  ['P1_JOYSTICK_DOWN', 'Abajo'],
  ['P1_JOYSTICK_LEFT', 'Izquierda'],
  ['P1_JOYSTICK_RIGHT', 'Derecha'],
  ...Array.from({ length: 8 }, (_, i) => [`P1_BUTTON${i + 1}`, `Botón ${i + 1}`]),
  ['COIN1', 'Crédito'],
  ['START1', 'Iniciar'],
  ['UI_PAUSE', 'Pausa'],
  ['UI_MENU', 'Menú del juego']
] as const
export type ArcadeBinding = { key: string; button: number | null }
export type ArcadeControls = Record<string, ArcadeBinding>
export const keyTokens: Record<string, string> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  Space: 'SPACE',
  Enter: 'ENTER',
  Tab: 'TAB',
  Escape: 'ESC',
  ControlLeft: 'LCONTROL',
  ControlRight: 'RCONTROL',
  ShiftLeft: 'LSHIFT',
  ShiftRight: 'RSHIFT',
  AltLeft: 'LALT',
  AltRight: 'RALT',
  Backspace: 'BACKSPACE',
  Delete: 'DEL',
  Home: 'HOME',
  End: 'END',
  PageUp: 'PGUP',
  PageDown: 'PGDN',
  ...Object.fromEntries(
    Array.from({ length: 26 }, (_, i) => [
      `Key${String.fromCharCode(65 + i)}`,
      String.fromCharCode(65 + i)
    ])
  ),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`Digit${i}`, String(i)])),
  ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, `F${i + 1}`]))
}
export function defaultArcadeControls(): ArcadeControls {
  const keys = [
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ControlLeft',
    'AltLeft',
    'Space',
    'ShiftLeft',
    'KeyZ',
    'KeyX',
    'KeyC',
    'KeyV',
    'Digit5',
    'Digit1',
    'KeyP',
    'Tab'
  ]
  return Object.fromEntries(
    arcadeActions.map(([action], i) => [
      action,
      {
        key: keys[i],
        button:
          i >= 4 && i < 10
            ? i - 3
            : i === 12
              ? 7
              : i === 13
                ? 8
                : i === 14
                  ? 10
                  : i === 15
                    ? 9
                    : null
      }
    ])
  )
}
export function validateArcadeControls(value: unknown): ArcadeControls {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Controles no válidos.')
  const result: ArcadeControls = {}
  for (const [action] of arcadeActions) {
    const binding = (value as ArcadeControls)[action]
    if (
      !binding ||
      typeof binding.key !== 'string' ||
      !Object.hasOwn(keyTokens, binding.key) ||
      (binding.button !== null &&
        (!Number.isInteger(binding.button) || binding.button < 1 || binding.button > 32))
    )
      throw new Error(`Asignación no válida: ${action}`)
    if (action !== 'UI_MENU' && binding.key === 'Tab')
      throw new Error('Tab está reservado para el menú de MAME.')
    if (action !== 'UI_PAUSE' && ['KeyP', 'F5'].includes(binding.key))
      throw new Error('P y F5 están reservados para pausa.')
    result[action] = { key: binding.key, button: binding.button }
  }
  return result
}
export function arcadeControllerXml(value: ArcadeControls): string {
  const controls = validateArcadeControls(value)
  const ports = arcadeActions.map(([action]) => {
    const binding = controls[action]
    const sequence = [`KEYCODE_${keyTokens[binding.key]}`]
    if (binding.button !== null) sequence.push(`JOYCODE_1_BUTTON${binding.button}`)
    const direction = (
      {
        P1_JOYSTICK_UP: 'YAXIS_UP_SWITCH',
        P1_JOYSTICK_DOWN: 'YAXIS_DOWN_SWITCH',
        P1_JOYSTICK_LEFT: 'XAXIS_LEFT_SWITCH',
        P1_JOYSTICK_RIGHT: 'XAXIS_RIGHT_SWITCH'
      } as Record<string, string>
    )[action]
    if (direction) {
      sequence.push(`JOYCODE_1_${direction}`)
      sequence.push(`JOYCODE_1_HAT1${action.replace('P1_JOYSTICK_', '')}`)
    }
    if (action === 'UI_MENU') sequence.push('KEYCODE_TAB')
    if (action === 'UI_PAUSE') sequence.push('KEYCODE_P', 'KEYCODE_F5')
    return `<port type="${action}"><newseq type="standard">${[...new Set(sequence)].join(' OR ')}</newseq></port>`
  })
  return `<?xml version="1.0"?><mameconfig version="10"><system name="default"><input>${ports.join('')}</input></system></mameconfig>`
}
