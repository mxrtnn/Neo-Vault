export type VaultAction =
  'up' | 'down' | 'left' | 'right' | 'accept' | 'back' | 'favorite' | 'previous' | 'next'
export function gamepadAction(
  pad: Pick<Gamepad, 'mapping' | 'buttons' | 'axes'>,
  bindings?: Partial<Record<VaultAction, { button: number | null }>>
): VaultAction | null {
  if (pad.mapping !== 'standard') return null
  const pressed = (index: number): boolean => pad.buttons[index]?.pressed ?? false
  if (bindings) {
    for (const action of [
      'back',
      'accept',
      'favorite',
      'previous',
      'next',
      'up',
      'down',
      'left',
      'right'
    ] as VaultAction[]) {
      const button = bindings[action]?.button
      if (button !== undefined && button !== null && pressed(button)) return action
    }
    if ((pad.axes[1] ?? 0) < -0.55) return 'up'
    if ((pad.axes[1] ?? 0) > 0.55) return 'down'
    if ((pad.axes[0] ?? 0) < -0.55) return 'left'
    if ((pad.axes[0] ?? 0) > 0.55) return 'right'
    return null
  }
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

// Require a neutral controller after focus/device changes to avoid accidental launches.
export function createGamepadGate(): (
  action: VaultAction | null,
  time: number,
  enabled: boolean
) => VaultAction | null {
  let armed = false
  let last: VaultAction | null = null
  let nextRepeat = 0
  return (action, time, enabled) => {
    if (!enabled) {
      armed = false
      last = null
      return null
    }
    if (!action) {
      armed = true
      last = null
      return null
    }
    if (!armed) return null
    const repeat = ['up', 'down', 'left', 'right', 'previous', 'next'].includes(action)
    const send = action !== last || (repeat && time >= nextRepeat)
    if (send) nextRepeat = time + (action === last ? 160 : 380)
    last = action
    return send ? action : null
  }
}
