import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, Heart, Play, RefreshCw, Search } from 'lucide-react'
import { catalogSources, fetchCatalog } from '../catalog'
import { useVaultAction } from '../hooks/useInputDevices'
import GamePreview from './GamePreview'
type Props = {
  system: { id: string; name: string; brand: string; mark: string; games: string[] }
  favorites: string[]
  onFavorite: (id: string) => void
  onBack: () => void
}
const cache = new Map<string, string[]>()
export default function GameLibrary({
  system,
  favorites,
  onFavorite,
  onBack
}: Props): React.JSX.Element {
  const [games, setGames] = useState<string[]>(cache.get(system.id) || system.games)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'sample'>(
    catalogSources[system.id] ? 'loading' : 'sample'
  )
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [notice, setNotice] = useState('')
  const wheelTime = useRef(0)
  const wheelRef = useRef<HTMLElement>(null)
  const [slotCount, setSlotCount] = useState(5)
  useEffect(() => {
    if (!catalogSources[system.id]) return
    const controller = new AbortController()
    let disposed = false
    const timeout = window.setTimeout(() => controller.abort(), 25000)
    fetchCatalog(system.id, controller.signal)
      .then((result) => {
        if (disposed) return
        cache.set(system.id, result)
        setGames(result)
        setSelectedIndex(0)
        setStatus('ready')
      })
      .catch(() => {
        if (disposed) return
        setStatus('error')
        setError('No se pudo actualizar el catálogo. Revisa tu conexión y vuelve a intentar.')
      })
      .finally(() => window.clearTimeout(timeout))
    return () => {
      disposed = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [system.id, attempt])
  useEffect(() => {
    const wheel = wheelRef.current
    if (!wheel) return
    const observer = new ResizeObserver(([entry]) => {
      const row =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--wheel-row-height')
        ) || 64
      setSlotCount(
        Math.max(1, Math.min(7, Math.floor((entry.contentRect.height - 80) / (row + 8))))
      )
    })
    observer.observe(wheel)
    return () => observer.disconnect()
  }, [])
  const filtered = useMemo(
    () =>
      games.filter(
        (game) =>
          game.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
          (!onlyFavorites || favorites.includes(`${system.id}:${game}`))
      ),
    [games, query, onlyFavorites, favorites, system.id]
  )
  const current = Math.max(0, Math.min(selectedIndex, filtered.length - 1))
  const selected = filtered[current]
  const start = Math.max(
    0,
    Math.min(current - Math.floor(slotCount / 2), filtered.length - slotCount)
  )
  const visible = filtered.slice(start, start + slotCount)
  const saved = !!selected && favorites.includes(`${system.id}:${selected}`)
  function move(delta: number): void {
    const length = filtered.length
    setSelectedIndex(length ? (((current + delta) % length) + length) % length : 0)
    setNotice('')
  }
  function select(game = selected): void {
    if (game)
      setNotice(
        'Este título aún no tiene un archivo y emulador asociados. Ya puedes probar la navegación y los favoritos con teclado o mando.'
      )
  }
  useVaultAction((action) => {
    if (action === 'back') {
      if (notice) setNotice('')
      else onBack()
    }
    if (action === 'up' || action === 'left') move(-1)
    if (action === 'down' || action === 'right') move(1)
    if (action === 'previous') move(-10)
    if (action === 'next') move(10)
    if (action === 'accept') select()
    if (action === 'favorite' && selected) onFavorite(`${system.id}:${selected}`)
  })
  return (
    <main className="hyperspin-library">
      <div className="catalog-topbar">
        <button className="back" onClick={onBack}>
          <ArrowLeft size={17} /> {system.name}
        </button>
        <span className="subtle">
          {status === 'ready'
            ? `${games.length.toLocaleString('es')} títulos y variantes · Libretro`
            : status === 'loading'
              ? 'Consultando catálogo…'
              : 'Selección de muestra'}
        </span>
      </div>
      <div className="library-toolbar">
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Buscar juegos"
            placeholder="Buscar un clásico…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
          />
        </label>
        <button
          className={`secondary filter-button ${onlyFavorites ? 'active' : ''}`}
          aria-pressed={onlyFavorites}
          onClick={() => {
            setOnlyFavorites((v) => !v)
            setSelectedIndex(0)
          }}
        >
          <Heart size={16} />
          Favoritos
        </button>
        {catalogSources[system.id] && (
          <button
            className="secondary filter-button"
            disabled={status === 'loading'}
            onClick={() => {
              setStatus('loading')
              setError('')
              setAttempt((v) => v + 1)
            }}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        )}
        <span className="subtle">{filtered.length.toLocaleString('es')} resultados</span>
      </div>
      {status === 'error' && (
        <p className="catalog-status" role="status">
          {error} Se conserva{' '}
          {cache.has(system.id) ? 'la lista de esta sesión' : 'la selección de muestra'}.
        </p>
      )}
      <div className="game-stage">
        <section className="game-hero">
          {selected ? (
            <>
              <div className="game-cinematic" key={`${system.id}:${selected}`}>
                <GamePreview key={selected} game={selected} systemId={system.id} />
              </div>
              <div className="game-description">
                <span className="eyebrow">
                  {system.mark} / {status === 'sample' ? 'MUESTRA' : 'CATÁLOGO DE REFERENCIA'}
                </span>
                <h1 title={selected}>{selected}</h1>
                <div className="game-actions">
                  <button className="primary" onClick={() => select()}>
                    <Play size={18} />
                    SELECCIONAR JUEGO
                  </button>
                  <button
                    className="favorite-action"
                    aria-pressed={saved}
                    aria-label={saved ? 'Quitar favorito' : 'Añadir favorito'}
                    onClick={() => onFavorite(`${system.id}:${selected}`)}
                  >
                    <Heart fill={saved ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-library">
              <Search size={45} />
              <h1>Sin resultados</h1>
              <p>Prueba otra búsqueda o desactiva Favoritos.</p>
            </div>
          )}
        </section>
        <section
          ref={wheelRef}
          className="game-wheel"
          aria-label="Selector de juegos"
          onWheel={(e) => {
            if (Math.abs(e.deltaY) > 5 && performance.now() - wheelTime.current > 130) {
              wheelTime.current = performance.now()
              move(e.deltaY > 0 ? 1 : -1)
            }
          }}
        >
          <div className="section-heading">
            <span>SELECCIONA TU JUEGO</span>
            <span>
              {selected ? current + 1 : 0} / {filtered.length}
            </span>
          </div>
          <button
            className="wheel-arrow"
            aria-label="Juego anterior"
            disabled={!selected}
            onClick={() => move(-1)}
          >
            <ChevronUp />
          </button>
          <div
            className="game-wheel-slots"
            style={{ gridTemplateRows: `repeat(${slotCount}, var(--wheel-row-height))` }}
          >
            {visible.map((game, i) => {
              const position = start + i
              return (
                <button
                  data-vault-item
                  key={game}
                  className={`game-wheel-card ${current === position ? 'selected' : ''}`}
                  aria-pressed={current === position}
                  onClick={() => {
                    setSelectedIndex(position)
                    setNotice('')
                  }}
                  onDoubleClick={() => select(game)}
                >
                  <span className="game-wheel-index">{String(position + 1).padStart(2, '0')}</span>
                  <span className="game-wheel-title" title={game}>
                    {game}
                  </span>
                  <span className="game-wheel-heart">
                    {favorites.includes(`${system.id}:${game}`) && (
                      <Heart size={16} fill="currentColor" />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          <button
            className="wheel-arrow"
            aria-label="Juego siguiente"
            disabled={!selected}
            onClick={() => move(1)}
          >
            <ChevronDown />
          </button>
        </section>
      </div>
      <div className="catalog-bottom" role="status">
        <span>
          {notice ||
            '↑ ↓ / Stick: navegar · Enter / A: seleccionar · F / Y: favorito · Esc / B: volver'}
        </span>
        {notice && (
          <button onClick={() => setNotice('')} aria-label="Cerrar aviso">
            ×
          </button>
        )}
        <a href="https://github.com/libretro/libretro-database" target="_blank" rel="noreferrer">
          Fuente
        </a>
      </div>
    </main>
  )
}
