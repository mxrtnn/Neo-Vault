import type { PlayableSystem } from '../../../shared/launcher'
import { useLauncher } from '../hooks/useLauncher'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, Heart, Play, RefreshCw, Search } from 'lucide-react'
import { catalogSources, fetchCatalog } from '../catalog'
import { useVaultAction } from '../hooks/useInputDevices'
import GamePreview from './GamePreview'
type Props = {
  system: { id: string; name: string; brand: string; mark: string; games: string[] }
  profileId: string
  favorites: string[]
  onFavorite: (id: string) => void
  onBack: () => void
}
const cache = new Map<string, string[]>()
export default function GameLibrary({
  system,
  profileId,
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
  const [onlyLocal, setOnlyLocal] = useState(false)
  const [notice, setNotice] = useState('')
  const { config, error: configError, setConfig } = useLauncher()
  const [busy, setBusy] = useState(false)
  const [running, setRunning] = useState(false)
  const wheelTime = useRef(0)
  useEffect(
    () =>
      window.api.launcher.onEvent((event) => {
        setRunning(event.status === 'running')
        setNotice(event.message)
      }),
    []
  )
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
  const combinedGames = useMemo(
    () => [
      ...new Set([
        ...games,
        ...Object.keys(config?.bindings ?? {})
          .filter((key) => key.startsWith(`${system.id}:`))
          .map((key) => key.slice(system.id.length + 1))
      ])
    ],
    [games, config, system.id]
  )
  const filtered = useMemo(
    () =>
      combinedGames.filter(
        (game) =>
          game.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
          (!onlyFavorites || favorites.includes(`${system.id}:${game}`)) &&
          (!onlyLocal || !!config?.bindings[`${system.id}:${game}`])
      ),
    [combinedGames, query, onlyFavorites, onlyLocal, config, favorites, system.id]
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
    if (busy || running) return
    const length = filtered.length
    setSelectedIndex(length ? (((current + delta) % length) + length) % length : 0)
    setNotice('')
  }
  const playable = system.id === 'nes' || system.id === 'snes'
  const bound = selected ? config?.bindings[`${system.id}:${selected}`] : undefined
  async function importLocal(): Promise<void> {
    if (!playable || busy || running) return
    setBusy(true)
    try {
      const imported = await window.api.launcher.importGame(system.id as PlayableSystem)
      if (imported) {
        setConfig(imported.config)
        setQuery(imported.title)
        setOnlyLocal(true)
        setOnlyFavorites(false)
        setSelectedIndex(0)
        setNotice(
          'Juego importado. Selecciona RetroArch y el núcleo en Configuración si todavía no lo hiciste.'
        )
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo importar el juego.')
    } finally {
      setBusy(false)
    }
  }
  async function associate(game = selected): Promise<void> {
    if (!game || !playable || busy || running) return
    setBusy(true)
    try {
      const next = await window.api.launcher.chooseGame(system.id as PlayableSystem, game)
      if (next) {
        setConfig(next)
        setNotice(
          'Archivo asociado a este título. Ya puedes pulsar Jugar cuando RetroArch y el núcleo estén configurados.'
        )
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo asociar el archivo.')
    } finally {
      setBusy(false)
    }
  }
  async function select(game = selected): Promise<void> {
    if (!game || busy || running) return
    if (!playable) {
      setNotice(
        'La primera integración admite NES y SNES. Esta consola se conectará en una próxima etapa.'
      )
      return
    }
    if (configError || !config) {
      setNotice(configError || 'Cargando configuración de emulación…')
      return
    }
    const systemId = system.id as PlayableSystem
    if (!config.retroarchPath || !config.cores[systemId]) {
      setNotice('Abre Configuración y selecciona RetroArch y el núcleo de esta consola.')
      return
    }
    if (!config.bindings[`${system.id}:${game}`]) {
      await associate(game)
      return
    }
    setBusy(true)
    try {
      const result = await window.api.launcher.launch(systemId, game, profileId)
      setNotice(result.message)
    } catch {
      setNotice('No se pudo comunicar con el lanzador. Reinicia Neo-Vault y vuelve a intentar.')
    } finally {
      setBusy(false)
    }
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
    if (action === 'accept') void select()
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
        {playable && (
          <>
            <button
              className={`secondary filter-button ${onlyLocal ? 'active' : ''}`}
              aria-pressed={onlyLocal}
              onClick={() => {
                setOnlyLocal((v) => !v)
                setSelectedIndex(0)
              }}
            >
              Archivos locales
            </button>
            <button
              className="secondary filter-button"
              disabled={busy || running || !config}
              onClick={() => {
                void importLocal()
              }}
            >
              Importar juego
            </button>
          </>
        )}
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
                <p className="game-association" title={bound}>
                  {bound
                    ? 'ARCHIVO LOCAL ASOCIADO'
                    : playable
                      ? 'SIN ARCHIVO LOCAL'
                      : 'EMULACIÓN PENDIENTE'}
                </p>
                <div className="game-actions">
                  <button
                    className="primary"
                    disabled={busy || running}
                    onClick={() => {
                      void select()
                    }}
                  >
                    <Play size={18} />
                    {busy
                      ? 'PREPARANDO…'
                      : running
                        ? 'EN EJECUCIÓN'
                        : bound
                          ? 'JUGAR'
                          : 'SELECCIONAR JUEGO'}
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
                {playable && (
                  <button
                    className="associate-button"
                    disabled={busy || running}
                    onClick={() => {
                      void associate()
                    }}
                  >
                    {bound
                      ? 'Cambiar archivo asociado'
                      : 'Asociar archivo local (.nes / .sfc / .smc)'}
                  </button>
                )}
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
                  onDoubleClick={() => {
                    void select(game)
                  }}
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
