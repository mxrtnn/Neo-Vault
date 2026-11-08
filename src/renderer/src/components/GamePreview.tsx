import { useState } from 'react'
import { Gamepad2 } from 'lucide-react'
import { catalogSources } from '../catalog'
const thumbnailSystems: Record<string, string> = { arcade: 'MAME' }
export default function GamePreview({
  systemId,
  game
}: {
  systemId: string
  game: string
}): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  const system = catalogSources[systemId]?.name.replaceAll(' ', '_') ?? thumbnailSystems[systemId]
  const file = game.replace(/[&*/:`<>?\\|]/g, '_')
  const src = system
    ? `https://raw.githubusercontent.com/libretro-thumbnails/${system}/master/Named_Snaps/${encodeURIComponent(file)}.png`
    : ''
  return (
    <div className="game-preview">
      {!failed && src ? (
        <img
          src={src}
          alt={`Vista previa de ${game}`}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="preview-placeholder">
          <Gamepad2 strokeWidth={0.7} />
          <span>VISTA PREVIA NO DISPONIBLE</span>
        </div>
      )}
      <span className="crt-scanlines" aria-hidden="true" />
      <span className="preview-label">NEO-VAULT / PREVIEW</span>
    </div>
  )
}
