import type { VaultAction } from './controls'
export type NavigationBinding = { key: string; button: number | null }
export type NavigationControls = Record<VaultAction, NavigationBinding>
export const navigationActions: [VaultAction, string][] = [
  ['up', 'Arriba'],
  ['down', 'Abajo'],
  ['left', 'Izquierda'],
  ['right', 'Derecha'],
  ['accept', 'Seleccionar'],
  ['back', 'Volver'],
  ['favorite', 'Favorito'],
  ['previous', 'Retroceder 10'],
  ['next', 'Avanzar 10']
]
export function defaultNavigation(): NavigationControls {
  const keys = [
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Enter',
    'Escape',
    'KeyF',
    'PageUp',
    'PageDown'
  ]
  const buttons = [12, 13, 14, 15, 0, 1, 3, 4, 5]
  return Object.fromEntries(
    navigationActions.map(([action], i) => [action, { key: keys[i], button: buttons[i] }])
  ) as NavigationControls
}
export function readNavigation(): NavigationControls {
  try {
    const value = JSON.parse(localStorage.getItem('neo-vault.navigation.v1') ?? 'null')
    if (
      value &&
      navigationActions.every(
        ([action]) =>
          typeof value[action]?.key === 'string' &&
          value[action].key.length < 40 &&
          (value[action].button === null ||
            (Number.isInteger(value[action].button) &&
              value[action].button >= 0 &&
              value[action].button < 64))
      )
    )
      return value
  } catch {
    /* Defaults keep navigation available. */
  }
  return defaultNavigation()
}
export function saveNavigation(value: NavigationControls): void {
  localStorage.setItem('neo-vault.navigation.v1', JSON.stringify(value))
  window.dispatchEvent(new Event('vault-controls-changed'))
}
export function navigationKey(controls: NavigationControls, code: string): VaultAction | null {
  return navigationActions.find(([action]) => controls[action].key === code)?.[0] ?? null
}
export function controlKeyLabel(code: string): string {
  const labels: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    ControlLeft: 'Ctrl izq.',
    ControlRight: 'Ctrl der.',
    AltLeft: 'Alt izq.',
    AltRight: 'Alt der.',
    ShiftLeft: 'Mayús. izq.',
    ShiftRight: 'Mayús. der.',
    Space: 'Espacio',
    Escape: 'Esc',
    PageUp: 'RePág',
    PageDown: 'AvPág'
  }
  return labels[code] ?? code.replace(/^Key|^Digit/, '')
}
