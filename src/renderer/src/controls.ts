export type VaultAction =
  'up' | 'down' | 'left' | 'right' | 'accept' | 'back' | 'favorite' | 'previous' | 'next'
export function gamepadAction(
  pad: Pick<Gamepad, 'mapping' | 'buttons' | 'axes'>
): VaultAction | null {
  if (pad.mapping !== 'standard') return null
  const pressed = (index: number): boolean => pad.buttons[index]?.pressed ?? false
  if (pressed(1)) return 'back'
  if (pressed(0)) return 'accept'
  if (pressed(3)) return 'favorite'
  if (pressed(4)) return 'previous'
  if (pressed(5)) return 'next'
  if (pressed(12) || (pad.axes[1] ?? 0) < -0.55) return 'up'
  if (pressed(13) || (pad.axes[1] ?? 0) > 0.55) return 'down'
  if (pressed(14) || (pad.axes[0] ?? 0) < -0.55) return 'left'
  if (pressed(15) || (pad.axes[0] ?? 0) > 0.55) return 'right'
  return null
}
export function emitAction(action: VaultAction): void {
  window.dispatchEvent(new CustomEvent<VaultAction>('vault-action', { detail: action }))
}
