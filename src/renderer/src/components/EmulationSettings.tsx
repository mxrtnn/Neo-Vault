import { useState } from 'react'
import { CheckCircle2, Download, FolderOpen } from 'lucide-react'
import type { LauncherConfig } from '../../../shared/launcher'
import { useLauncher } from '../hooks/useLauncher'
export default function EmulationSettings(): React.JSX.Element {
  const { config, error, setConfig } = useLauncher()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  async function choose(action: () => Promise<LauncherConfig | null>): Promise<void> {
    setBusy(true)
    try {
      const next = await action()
      if (next) {
        setConfig(next)
        setNotice('Configuración guardada en data/launcher.json.')
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar la configuración.')
    } finally {
      setBusy(false)
    }
  }
  const rows = [
    {
      label: '1. RetroArch para Windows',
      file: config?.retroarchPath,
      action: () => window.api.launcher.chooseRetroarch(),
      hint: 'Selecciona retroarch.exe de la versión oficial para Windows.'
    },
    {
      label: '2. Nintendo NES · FCEUmm',
      file: config?.cores.nes,
      action: () => window.api.launcher.chooseCore('nes'),
      hint: 'En RetroArch: Actualizador en línea → Descargador de núcleos → Nintendo NES / Famicom (FCEUmm). Selecciona cores/fceumm_libretro.dll.'
    },
    {
      label: '3. Super Nintendo · Snes9x',
      file: config?.cores.snes,
      action: () => window.api.launcher.chooseCore('snes'),
      hint: 'En RetroArch: Actualizador en línea → Descargador de núcleos → Nintendo SNES / SFC (Snes9x). Selecciona cores/snes9x_libretro.dll.'
    }
  ]
  return (
    <section className="settings-panel emulation-settings">
      <span className="eyebrow">PRIMERA INTEGRACIÓN / WINDOWS</span>
      <h2>Conecta tu emulación</h2>
      <p>
        Instala RetroArch y solo los núcleos que necesites. Después asocia un archivo .nes, .sfc o
        .smc desde el catálogo. Las demás consolas siguen disponibles para explorar.
      </p>
      <a
        className="download-link"
        href="https://www.retroarch.com/platforms.html"
        target="_blank"
        rel="noreferrer"
      >
        <Download size={17} /> Descargar RetroArch desde su sitio oficial
      </a>
      {rows.map((row) => (
        <div className="runtime-row" key={row.label}>
          <div>
            <h3>
              {row.file && <CheckCircle2 size={16} />} {row.label}
            </h3>
            <p>{row.hint}</p>
            <code>{row.file || 'Sin seleccionar'}</code>
          </div>
          <button
            className="secondary"
            disabled={busy || !!error || !config}
            onClick={() => {
              void choose(row.action)
            }}
          >
            <FolderOpen size={16} />
            Seleccionar
          </button>
        </div>
      ))}
      <p>
        Los guardados y estados se separan por perfil, consola y título en data/profiles dentro de
        Neo-Vault. Conserva esa carpeta al actualizar o mover la aplicación. No se activa la carga
        automática de estados.
      </p>
      <p>
        La configuración de controles del launcher y la de RetroArch son independientes; comprueba
        ambos antes de jugar. El acceso a memoria, estados y compatibilidad dependen del núcleo.
      </p>
      {(notice || error) && (
        <p className="notice" role="status">
          {error || notice}
        </p>
      )}
    </section>
  )
}
