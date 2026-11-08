import { useEffect, useState } from 'react'
import { Gamepad2 } from 'lucide-react'
import { catalogSources } from '../catalog'
import {
  cleanMediaName,
  resolveMedia,
  type MediaManifest,
  type MediaCandidate,
  type MediaKind
} from '../mediaPlan'
const indexes = import.meta.glob<{ default: MediaManifest }>('../assets/media/*.json')
const cache = new Map<string, Promise<MediaManifest | null>>()
function indexFor(system: string): Promise<MediaManifest | null> {
  if (!cache.has(system)) {
    const loader = indexes[`../assets/media/${system}.json`]
    cache.set(
      system,
      loader
        ? loader()
            .then((module) => module.default)
            .catch(() => null)
        : Promise.resolve(null)
    )
  }
  return cache.get(system)!
}
export default function GameArtwork({
  systemId,
  game,
  preferred = 'snap',
  compact = false
}: {
  systemId: string
  game: string
  preferred?: MediaKind
  compact?: boolean
}): React.JSX.Element {
  const [candidates, setCandidates] = useState<MediaCandidate[]>([])
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    indexFor(systemId).then((manifest) => {
      if (!active) return
      if (manifest) setCandidates(resolveMedia(manifest, game, preferred))
      else {
        const repository =
          systemId === 'arcade'
            ? 'MAME'
            : (catalogSources[systemId]?.name.replaceAll(' ', '_') ?? '')
        const name = cleanMediaName(game)
        const folders = { box: 'Named_Boxarts', snap: 'Named_Snaps', title: 'Named_Titles' }
        setCandidates(
          repository
            ? [
                {
                  name,
                  kind: preferred,
                  alternative: false,
                  url: `https://raw.githubusercontent.com/libretro-thumbnails/${repository}/master/${folders[preferred]}/${encodeURIComponent(name)}.png`
                }
              ]
            : []
        )
      }
    })
    return () => {
      active = false
    }
  }, [systemId, game, preferred])
  const candidate = candidates[attempt]
  return (
    <span className={`game-artwork ${compact ? 'game-artwork--compact' : ''}`}>
      {candidate ? (
        <img
          src={candidate.url}
          alt={
            compact
              ? ''
              : `${candidate.kind === 'box' ? 'Portada' : 'Referencia visual'}: ${candidate.name}`
          }
          title={
            candidate.alternative
              ? `Imagen de referencia de otra edición: ${candidate.name}`
              : candidate.name
          }
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setAttempt((index) => index + 1)}
        />
      ) : (
        <span className="artwork-placeholder">
          <Gamepad2 strokeWidth={0.8} />
          {!compact && <small>IMAGEN NO DISPONIBLE</small>}
        </span>
      )}
      {!compact && candidate?.alternative && (
        <small className="edition-note">Referencia de otra edición: {candidate.name}</small>
      )}
    </span>
  )
}
