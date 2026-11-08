import { useEffect, useState } from 'react'
import { emitAction, gamepadAction, type VaultAction } from '../controls'
export type InputStatus = { name: string; standard: boolean; lastAction: string }
export function useInputDevices(): InputStatus {
  const [status, setStatus] = useState<InputStatus>({
    name: '',
    standard: false,
    lastAction: 'Sin actividad'
  })
  useEffect(() => {
    const keymap: Record<string, VaultAction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      Enter: 'accept',
      Escape: 'back',
      f: 'favorite',
      F: 'favorite',
      PageUp: 'previous',
      PageDown: 'next'
    }
    function keyboard(event: KeyboardEvent): void {
      const target = event.target as HTMLElement
      if (
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target.closest('input,textarea,select,[contenteditable="true"]')
      )
        return
      const action = keymap[event.key]
      if (
        !action ||
        (event.key === 'Enter' &&
          target.closest('button,a') &&
          !target.closest('[data-vault-item]'))
      )
        return
      if (event.repeat && ['accept', 'back', 'favorite'].includes(action)) return
      event.preventDefault()
      setStatus((s) => ({ ...s, lastAction: `Teclado: ${event.key}` }))
      emitAction(action)
    }
    let frame = 0
    let signature = ''
    let last: VaultAction | null = null
    let nextRepeat = 0
    const poll = (time: number): void => {
      try {
        const pads = Array.from(navigator.getGamepads?.() ?? []).filter(
          (p): p is Gamepad => !!p?.connected
        )
        const pad = pads.find((p) => p.mapping === 'standard') ?? pads[0]
        const nextSignature = pad ? `${pad.index}:${pad.id}:${pad.mapping}` : ''
        if (signature !== nextSignature) {
          signature = nextSignature
          last = null
          setStatus((s) => ({ ...s, name: pad?.id ?? '', standard: pad?.mapping === 'standard' }))
        }
        const action = pad ? gamepadAction(pad) : null
        const typing = document.activeElement?.closest(
          'input,textarea,select,[contenteditable="true"]'
        )
        if (action && document.hasFocus() && !typing) {
          const repeat = ['up', 'down', 'left', 'right', 'previous', 'next'].includes(action)
          if (action !== last || (repeat && time >= nextRepeat)) {
            nextRepeat = time + (action === last ? 160 : 380)
            setStatus((s) => ({ ...s, lastAction: `Mando: ${action}` }))
            emitAction(action)
          }
        }
        last = action
      } catch {
        /* Keyboard stays available when Gamepad API is unavailable. */
      }
      frame = requestAnimationFrame(poll)
    }
    window.addEventListener('keydown', keyboard)
    frame = requestAnimationFrame(poll)
    return () => {
      window.removeEventListener('keydown', keyboard)
      cancelAnimationFrame(frame)
    }
  }, [])
  return status
}
export function useVaultAction(handler: (action: VaultAction) => void): void {
  useEffect(() => {
    const listener = (event: Event): void => handler((event as CustomEvent<VaultAction>).detail)
    window.addEventListener('vault-action', listener)
    return () => window.removeEventListener('vault-action', listener)
  }, [handler])
}
