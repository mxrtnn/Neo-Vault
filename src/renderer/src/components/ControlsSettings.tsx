import { useEffect, useState } from 'react'
import { Gamepad2, Keyboard, RotateCcw, Save } from 'lucide-react'
import {
  arcadeActions,
  defaultArcadeControls,
  keyTokens,
  validateArcadeControls,
  type ArcadeControls
} from '../../../shared/arcadeControls'
import {
  defaultNavigation,
  controlKeyLabel,
  navigationActions,
  readNavigation,
  saveNavigation
} from '../navigationControls'
import type { InputStatus } from '../hooks/useInputDevices'
import type { VaultAction } from '../controls'
import '../styles/settings.scss'
type Capture = { area: 'navigation' | 'arcade'; action: string; device: 'key' | 'pad' }
export default function ControlsSettings({
  profileId,
  input
}: {
  profileId: string
  input: InputStatus
}): React.JSX.Element {
  const [navigation, setNavigation] = useState(readNavigation)
  const [arcade, setArcade] = useState<ArcadeControls | null>(null)
  const [capture, setCapture] = useState<Capture | null>(null)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    let active = true
    window.api.launcher
      .getArcadeControls(profileId)
      .then((value) => {
        if (active) setArcade(value)
      })
      .catch(() => {
        if (active)
          setNotice('No se pudieron leer los controles de MAME. No se reemplazó ningún archivo.')
      })
    return () => {
      active = false
    }
  }, [profileId])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('vault-controls-capture', { detail: !!capture }))
    if (!capture) return
    function bind(value: string | number): void {
      if (!capture) return
      if (capture.area === 'navigation') {
        const field = capture.device === 'key' ? 'key' : 'button'
        const next = structuredClone(navigation)
        const action = capture.action as VaultAction
        const old = next[action][field]
        for (const [other] of navigationActions) {
          if (other !== action && next[other][field] === value)
            Object.assign(next[other], { [field]: old })
        }
        Object.assign(next[action], { [field]: value })
        try {
          saveNavigation(next)
          setNavigation(next)
          setNotice('Navegación guardada en este equipo.')
        } catch {
          setNotice('No se pudo guardar la navegación. Se conserva la asignación anterior.')
        }
      } else if (arcade) {
        setArcade({
          ...arcade,
          [capture.action]: { ...arcade[capture.action], key: String(value) }
        })
        setDirty(true)
      }
      setCapture(null)
    }
    const keyboard = (event: KeyboardEvent): void => {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.repeat || event.isComposing) return
      if (event.code === 'Escape') {
        setCapture(null)
        return
      }
      if (capture?.device !== 'key') return
      if (
        ['F11', 'MetaLeft', 'MetaRight'].includes(event.code) ||
        (capture?.area === 'navigation' &&
          (event.ctrlKey || event.altKey || event.metaKey || event.code === 'Tab')) ||
        (capture?.area === 'arcade' && !Object.hasOwn(keyTokens, event.code))
      ) {
        setNotice(
          'Esa tecla no está disponible. Elige una letra, número, flecha o tecla de función distinta de F11.'
        )
        return
      }
      bind(event.code)
    }
    let frame = 0
    let neutral = false
    const poll = (): void => {
      if (capture?.device === 'pad' && document.hasFocus()) {
        const pads = Array.from(navigator.getGamepads?.() ?? []).filter(
          (pad): pad is Gamepad => !!pad?.connected && pad.mapping === 'standard'
        )
        const pressed = pads
          .flatMap((pad) => pad.buttons.map((button, index) => (button.pressed ? index : -1)))
          .find((index) => index >= 0)
        if (pressed === undefined) neutral = true
        else if (neutral) {
          bind(pressed)
          return
        }
      }
      frame = requestAnimationFrame(poll)
    }
    window.addEventListener('keydown', keyboard, true)
    frame = requestAnimationFrame(poll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', keyboard, true)
      window.dispatchEvent(new CustomEvent('vault-controls-capture', { detail: false }))
    }
  }, [capture, navigation, arcade])
  async function save(): Promise<void> {
    if (!arcade) return
    setSaving(true)
    try {
      const value = await window.api.launcher.saveArcadeControls(
        profileId,
        validateArcadeControls(arcade)
      )
      setArcade(value)
      setDirty(false)
      setNotice(
        'Controles de arcade guardados para este perfil. Se aplican al próximo inicio del juego.'
      )
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }
  function resetNavigation(): void {
    const value = defaultNavigation()
    try {
      saveNavigation(value)
      setNavigation(value)
      setNotice('Navegación predeterminada restaurada.')
    } catch {
      setNotice('No se pudo guardar la navegación.')
    }
  }
  return (
    <div className="controls-dashboard">
      <section className="device-status">
        <Gamepad2 />
        <div>
          <strong>{input.name || 'Teclado disponible'}</strong>
          <p>
            {input.name
              ? input.standard
                ? 'Mando estándar detectado'
                : 'Configura este dispositivo desde Tab en MAME'
              : 'Conecta el mando en Windows y presiona un botón.'}
          </p>
          <span>{input.lastAction}</span>
        </div>
      </section>
      <div className="controls-columns">
        <section className="control-card">
          <h2>
            <Keyboard /> Navegación de Neo-Vault
          </h2>
          <p>Solo controla los menús. Los cambios se guardan automáticamente.</p>
          <div className="binding-head">
            <span>Acción</span>
            <span>Teclado</span>
            <span>Mando</span>
          </div>
          {navigationActions.map(([action, label]) => (
            <div className="binding-row" key={action}>
              <span>{label}</span>
              <button onClick={() => setCapture({ area: 'navigation', action, device: 'key' })}>
                {controlKeyLabel(navigation[action].key)}
              </button>
              <button
                disabled={!input.standard}
                onClick={() => setCapture({ area: 'navigation', action, device: 'pad' })}
              >
                Botón {(navigation[action].button ?? -1) + 1}
              </button>
            </div>
          ))}
          <button className="secondary" onClick={resetNavigation}>
            <RotateCcw size={16} /> Restaurar navegación
          </button>
        </section>
        <section className="control-card">
          <h2>
            <Gamepad2 /> Arcade · Jugador 1
          </h2>
          <p>
            Base de MAME para el perfil activo. Tab permite ajustar los botones reales de cada
            juego.
          </p>
          <div className="binding-head">
            <span>Acción</span>
            <span>Teclado</span>
            <span>Mando MAME</span>
          </div>
          {arcade &&
            arcadeActions.map(([action, label]) => (
              <div className="binding-row" key={action}>
                <span>{label}</span>
                <button
                  disabled={saving}
                  onClick={() => setCapture({ area: 'arcade', action, device: 'key' })}
                >
                  {controlKeyLabel(arcade[action].key)}
                </button>
                <select
                  aria-label={`Mando: ${label}`}
                  disabled={saving}
                  value={arcade[action].button ?? ''}
                  onChange={(event) => {
                    setArcade({
                      ...arcade,
                      [action]: {
                        ...arcade[action],
                        button: event.target.value === '' ? null : Number(event.target.value)
                      }
                    })
                    setDirty(true)
                  }}
                >
                  <option value="">Sin botón</option>
                  {Array.from({ length: 32 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      Botón {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          <p>
            La numeración de MAME puede diferir de la del navegador. Para identificar tu mando con
            precisión, usa Tab dentro del juego.
          </p>
          <div className="control-card-actions">
            <button
              className="primary"
              disabled={!arcade || saving || !dirty}
              onClick={() => {
                void save()
              }}
            >
              <Save size={16} /> {saving ? 'Guardando…' : 'Guardar arcade'}
            </button>
            <button
              className="secondary"
              disabled={saving || !arcade}
              onClick={() => {
                setArcade(defaultArcadeControls())
                setDirty(true)
              }}
            >
              Valores iniciales
            </button>
          </div>
          <p>
            {dirty
              ? 'Hay cambios sin guardar.'
              : 'Los ajustes específicos guardados desde Tab tienen prioridad.'}
          </p>
        </section>
      </div>
      <section className="control-card">
        <h2>Dentro del juego</h2>
        <p>
          <kbd>Tab</kbd> abre el menú nativo de MAME → Input Settings → Input Assignments (this
          system). Selecciona la acción, pulsa Enter y después la tecla o botón deseado. Sal del
          menú con Tab y cierra MAME normalmente para guardar los cambios.
        </p>
        <p>
          <kbd>P</kbd> o <kbd>F5</kbd> pausa y reanuda: el juego se congela, baja el brillo y
          aparece PAUSA. También puedes asignar un botón de mando arriba o desde Tab → Input
          Assignments (general) → User Interface → Pause.
        </p>
        <p>
          Estos ajustes de juego se aplican a MAME. Los controles dentro de NES/SNES se configuran
          desde RetroArch.
        </p>
      </section>
      {notice && (
        <p className="controls-notice" role="status">
          {notice}
        </p>
      )}
      {capture && (
        <div className="binding-modal-backdrop">
          <div
            className="binding-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Asignar control"
          >
            <Gamepad2 size={36} />
            <h2>
              {capture.device === 'key'
                ? 'Presiona una tecla'
                : 'Suelta el mando y presiona un botón'}
            </h2>
            <p>{capture.action} · Esc para cancelar</p>
            <button autoFocus className="secondary" onClick={() => setCapture(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
