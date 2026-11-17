import { useEffect, useState } from 'react'
import { createGamepadGate, emitAction, gamepadAction, type VaultAction } from '../controls'
import { navigationKey, readNavigation } from '../navigationControls'
export type InputStatus = { name: string; standard: boolean; lastAction: string }
export function useInputDevices(): InputStatus {
  const [status, setStatus] = useState<InputStatus>({
    name: '',
    standard: false,
    lastAction: 'Sin actividad'
  })
  useEffect(() => {
    let mappings = readNavigation()
    let capturing = false
    function keyboard(event: KeyboardEvent): void {
      const target = event.target as HTMLElement
      if (
        capturing ||
        event.defaultPrevented ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target.closest('input,textarea,select,[contenteditable="true"]')
      )
        return
      const action = navigationKey(mappings, event.code)
      if (
        !action ||
        (event.key === 'Enter' &&
          target.closest('button,a,summary') &&
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
    let gate = createGamepadGate()
    const disarm = (): void => {
      gate = createGamepadGate()
    }
    const poll = (time: number): void => {
      try {
        const pads = Array.from(navigator.getGamepads?.() ?? []).filter(
          (p): p is Gamepad => !!p?.connected
        )
        const pad = pads.find((p) => p.mapping === 'standard') ?? pads[0]
        const nextSignature = pad ? `${pad.index}:${pad.id}:${pad.mapping}` : ''
        if (signature !== nextSignature) {
          signature = nextSignature
          disarm()
          setStatus((s) => ({ ...s, name: pad?.id ?? '', standard: pad?.mapping === 'standard' }))
        }
        const action = pad ? gamepadAction(pad, mappings) : null
        const typing = document.activeElement?.closest(
          'input,textarea,select,[contenteditable="true"]'
        )
        const accepted = gate(action, time, document.hasFocus() && !typing && !capturing)
        if (accepted) {
          setStatus((s) => ({ ...s, lastAction: `Mando: ${accepted}` }))
          emitAction(accepted)
        }
      } catch {
        /* Keyboard stays available when Gamepad API is unavailable. */
      }
      frame = requestAnimationFrame(poll)
    }
    window.addEventListener('keydown', keyboard)
    const reload = (): void => {
      mappings = readNavigation()
      disarm()
      setStatus((s) => ({ ...s, lastAction: 'Controles actualizados' }))
    }
    const capture = (event: Event): void => {
      capturing = !!(event as CustomEvent<boolean>).detail
      disarm()
    }
    window.addEventListener('vault-controls-changed', reload)
    window.addEventListener('vault-controls-capture', capture)
    window.addEventListener('blur', disarm)
    frame = requestAnimationFrame(poll)
    return () => {
      window.removeEventListener('keydown', keyboard)
      window.removeEventListener('vault-controls-changed', reload)
      window.removeEventListener('vault-controls-capture', capture)
      window.removeEventListener('blur', disarm)
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
