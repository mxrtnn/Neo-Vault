import { useEffect, useState } from 'react'
import { Gamepad2 } from 'lucide-react'
import { consoleImages } from '../consoleImages'

export default function ConsoleImage({ systemId }: { systemId: string }): React.JSX.Element {
  const image = consoleImages[systemId]
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading')

  useEffect(() => {
    if (!image || status !== 'loading') return
    const timeout = window.setTimeout(() => setStatus('failed'), 15000)
    return () => window.clearTimeout(timeout)
  }, [image, status])

  return (
    <span className="console-image" aria-hidden="true">
      {(!image || status !== 'loaded') && <Gamepad2 strokeWidth={0.8} />}
      {image && status !== 'failed' && (
        <img
          src={image.url}
          alt=""
          referrerPolicy="no-referrer"
          decoding="async"
          className={status === 'loaded' ? 'is-loaded' : ''}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('failed')}
        />
      )}
    </span>
  )
}
