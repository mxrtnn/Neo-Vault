import { useEffect, useState } from 'react'
import type { LauncherConfig } from '../../../shared/launcher'
export function useLauncher(): {
  config: LauncherConfig | null
  error: string
  refresh: () => Promise<void>
  setConfig: (config: LauncherConfig) => void
} {
  const [config, setConfig] = useState<LauncherConfig | null>(null)
  const [error, setError] = useState('')
  async function refresh(): Promise<void> {
    try {
      setConfig(await window.api.launcher.getConfig())
      setError('')
    } catch {
      setError(
        'No se pudo leer la configuración de emulación. Revisa data/launcher.json; no se ha reemplazado el archivo.'
      )
    }
  }
  useEffect(() => {
    let active = true
    window.api.launcher
      .getConfig()
      .then((value) => {
        if (active) setConfig(value)
      })
      .catch(() => {
        if (active)
          setError('No se pudo leer la configuración de emulación. Revisa data/launcher.json.')
      })
    return () => {
      active = false
    }
  }, [])
  return { config, error, refresh, setConfig }
}
