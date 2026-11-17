import { useEffect, useRef, useState } from 'react'
import GamePreview from './GamePreview'
import '../styles/arcade.scss'

export default function ArcadePreview({
  game,
  video,
  light
}: {
  game: string
  video?: string
  light: boolean
}): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  const player = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const pause = (): void => {
      if (!document.hasFocus() || document.hidden) player.current?.pause()
      else void player.current?.play().catch(() => setFailed(true))
    }
    window.addEventListener('blur', pause)
    window.addEventListener('focus', pause)
    document.addEventListener('visibilitychange', pause)
    return () => {
      window.removeEventListener('blur', pause)
      window.removeEventListener('focus', pause)
      document.removeEventListener('visibilitychange', pause)
    }
  }, [])
  return (
    <div className="arcade-cabinet">
      <div className="arcade-marquee">
        <strong>MAME</strong>
      </div>
      <div className="arcade-monitor">
        <GamePreview systemId="arcade" game={game} />
        {video && !light && !failed && (
          <video
            ref={player}
            src={video}
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            aria-label={`Video de referencia: ${game}`}
            onError={() => setFailed(true)}
            onCanPlay={() => {
              if (document.hasFocus()) void player.current?.play().catch(() => setFailed(true))
            }}
          />
        )}
      </div>
      <div className="arcade-control-deck" aria-hidden="true">
        <i />
        <span>● ● ●</span>
      </div>
    </div>
  )
}
