import type { PlayableSystem, RetroSystem } from '../../../shared/launcher'
import { useLauncher } from '../hooks/useLauncher'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, Heart, Play, RefreshCw, Search } from 'lucide-react'
import { catalogSources, fetchCatalog } from '../catalog'
import { useVaultAction } from '../hooks/useInputDevices'
import GamePreview from './GamePreview'
import GameArtwork from './GameArtwork'
import ArcadePreview from './ArcadePreview'
import { arcadeDemoIndex, validArcadeVideo } from '../arcadeThemePlan'
import { readNavigation, controlKeyLabel } from '../navigationControls'
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
  const navigation = readNavigation()
  const [games, setGames] = useState<string[]>(cache.get(system.id) || system.games)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'sample'>(
    catalogSources[system.id] ? 'loading' : 'sample'
  )
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [onlyLocal, setOnlyLocal] = useState(system.id === 'arcade')
  const [notice, setNotice] = useState('')
  const isArcade = system.id === 'arcade'
  const [light, setLight] = useState(() => {
    try {
      return (
        localStorage.getItem('neo-vault.mame.light') === 'true' ||
        matchMedia('(prefers-reduced-motion: reduce)').matches
      )
    } catch {
      return true
    }
  })
  const [demo, setDemo] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const optionsRef = useRef<HTMLDetailsElement>(null)
  const [demonstrating, setDemonstrating] = useState(false)
  const lastInput = useRef(0)
  const restored = useRef(false)
  const [videos, setVideos] = useState<Record<string, string>>({})
  const videoUrls = useRef(new Set<string>())
  useEffect(
    () => () => {
      videoUrls.current.forEach((url) => URL.revokeObjectURL(url))
    },
    []
  )
  const { config, error: configError, setConfig } = useLauncher()
  const [busy, setBusy] = useState(false)
  const [running, setRunning] = useState(false)
  const [arcade, setArcade] = useState<typeof import('../../../shared/arcade') | null>(null)
  useEffect(() => {
    if (system.id !== 'arcade') return
    let active = true
    import('../../../shared/arcade').then((module) => {
      if (active) setArcade(module)
    })
    return () => {
      active = false
    }
  }, [system.id])
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
        restored.current = false
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
  }, [system.id, attempt, profileId])
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
          (!onlyLocal ||
            system.id !== 'arcade' ||
            (!!arcade?.arcadeByTitle.has(game) &&
              arcade.arcadeByTitle.get(game)?.status !== 'preliminary')) &&
          (!onlyLocal ||
            !!config?.bindings[`${system.id}:${game}`] ||
            (system.id === 'arcade' &&
              !!config?.mamePath &&
              !!arcade?.arcadeByTitle.get(game)?.romless))
      ),
    [combinedGames, query, onlyFavorites, onlyLocal, config, favorites, system.id, arcade]
  )
  const current = Math.max(0, Math.min(selectedIndex, filtered.length - 1))
  const selected = filtered[current]
  const start = Math.max(
    0,
    Math.min(current - Math.floor(slotCount / 2), filtered.length - slotCount)
  )
  const visible = filtered.slice(start, start + slotCount)
  const saved = !!selected && favorites.includes(`${system.id}:${selected}`)
  useEffect(() => {
    if (!isArcade || status !== 'ready' || !config || !arcade || restored.current) return
    let disposed = false
    let index = -1
    try {
      index = filtered.indexOf(localStorage.getItem(`neo-vault.mame.last.${profileId}`) ?? '')
    } catch {
      /* Optional preference. */
    }
    queueMicrotask(() => {
      if (disposed) return
      restored.current = true
      if (index >= 0) setSelectedIndex(index)
    })
    return () => {
      disposed = true
    }
  }, [isArcade, status, config, arcade, filtered, profileId])
  useEffect(() => {
    if (!isArcade || !restored.current || !selected || demonstrating) return
    try {
      localStorage.setItem(`neo-vault.mame.last.${profileId}`, selected)
    } catch {
      /* The catalog remains usable without storage. */
    }
  }, [isArcade, selected, profileId, demonstrating])
  useEffect(() => {
    if (!isArcade || !demo) return
    const touch = (): void => {
      lastInput.current = performance.now()
      setDemonstrating(false)
    }
    lastInput.current = performance.now()
    const events = ['keydown', 'pointerdown', 'pointermove', 'wheel', 'vault-action', 'blur']
    events.forEach((name) => window.addEventListener(name, touch))
    const timer = window.setInterval(() => {
      const now = performance.now()
      const blocked =
        optionsOpen ||
        busy ||
        running ||
        !document.hasFocus() ||
        !!document.activeElement?.closest('input,textarea,select')
      if (
        arcadeDemoIndex({
          now,
          lastInput: lastInput.current,
          count: filtered.length,
          index: 0,
          blocked
        }) === null
      )
        return
      setDemonstrating(true)
      setSelectedIndex(
        (index) =>
          arcadeDemoIndex({
            now,
            lastInput: lastInput.current,
            count: filtered.length,
            index,
            blocked
          }) ?? index
      )
    }, 7000)
    return () => {
      clearInterval(timer)
      events.forEach((name) => window.removeEventListener(name, touch))
    }
  }, [isArcade, demo, busy, running, optionsOpen, filtered.length])
  function move(delta: number): void {
    if (busy || running) return
    const length = filtered.length
    setSelectedIndex(length ? (((current + delta) % length) + length) % length : 0)
    setNotice('')
  }
  const playable = system.id === 'nes' || system.id === 'snes' || system.id === 'arcade'
  const arcadeGame = system.id === 'arcade' ? arcade?.arcadeByTitle.get(selected) : undefined
  const officialPage = arcadeGame ? arcade?.officialArcadePages[arcadeGame.id] : undefined
  const finalFight = arcade?.arcadeById.get('ffight')?.title
  const testTitle =
    finalFight && config?.bindings[`arcade:${finalFight}`]
      ? finalFight
      : config?.bindings['arcade:Gridlee']
        ? 'Gridlee'
        : 'Pong (Rev E)'
  const bound = selected ? config?.bindings[`${system.id}:${selected}`] : undefined
  async function importLocal(): Promise<void> {
    if (!playable || busy || running) return
    setBusy(true)
    try {
      if (system.id === 'arcade') {
        const result = await window.api.launcher.importArcadeFolder()
        if (result) {
          setConfig(result.config)
          setOnlyLocal(true)
          setQuery('')
          setOnlyFavorites(false)
          setSelectedIndex(0)
          setNotice(result.message)
        }
        return
      }
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
        'Por ahora se pueden ejecutar NES, SNES y MAME. Esta consola se conectará en una próxima etapa.'
      )
      return
    }
    if (configError || !config) {
      setNotice(configError || 'Cargando configuración de emulación…')
      return
    }
    const systemId = system.id as PlayableSystem
    if (systemId === 'arcade') {
      if (!config.mamePath) {
        setNotice('Prepara el emulador con npm run setup:mame y reinicia Neo-Vault.')
        return
      }
      const entry = arcade?.arcadeByTitle.get(game)
      if (!entry) {
        setNotice('Cargando información del catálogo MAME…')
        return
      }
      if (!entry.romless && !config.bindings[`arcade:${game}`]) {
        if (arcade?.officialArcadePages[entry.id]) {
          await sourcePage(game)
          return
        }
        setNotice(
          'Este título necesita sus archivos. Usa Añadir carpeta para detectar tu colección de una vez.'
        )
        return
      }
    } else if (!config.retroarchPath || !config.cores[systemId as RetroSystem]) {
      setNotice('Abre Configuración y selecciona RetroArch y el núcleo de esta consola.')
      return
    }
    if (systemId !== 'arcade' && !config.bindings[`${system.id}:${game}`]) {
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
  async function sourcePage(game = selected): Promise<void> {
    if (!game || busy || running) return
    setBusy(true)
    try {
      setNotice((await window.api.launcher.openArcadeSource(game)).message)
    } catch {
      setNotice('No se pudo abrir la fuente oficial.')
    } finally {
      setBusy(false)
    }
  }
  async function audit(all = false): Promise<void> {
    if ((!selected && !all) || busy || running) return
    setBusy(true)
    setNotice(
      all ? 'Verificando la colección detectada…' : 'Verificando el set y sus dependencias…'
    )
    try {
      setNotice((await window.api.launcher.auditArcade(all ? undefined : selected)).message)
    } catch {
      setNotice('No se pudo realizar la auditoría.')
    } finally {
      setBusy(false)
    }
  }
  useVaultAction((action) => {
    if (busy || running) return
    if (optionsOpen) {
      if (action === 'back' && optionsRef.current) {
        optionsRef.current.open = false
        optionsRef.current.querySelector('summary')?.focus()
      }
      return
    }
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
    <main
      className={`hyperspin-library${isArcade ? ` mame-library${light ? ' mame-light' : ''}` : ''}`}
    >
      {isArcade && <div className="arcade-scenery" aria-hidden="true" />}
      <div className="catalog-topbar">
        <button className="back" onClick={onBack}>
          <ArrowLeft size={17} /> {system.name}
        </button>
        {!isArcade && (
          <span className="subtle">
            {status === 'ready'
              ? `${games.length.toLocaleString('es')} títulos y variantes · ${system.id === 'arcade' ? 'MAME' : 'Libretro'}`
              : status === 'loading'
                ? 'Consultando catálogo…'
                : 'Selección de muestra'}
          </span>
        )}
      </div>
      {isArcade && (
        <details
          className="arcade-options"
          ref={optionsRef}
          onToggle={(event) => setOptionsOpen(event.currentTarget.open)}
        >
          <summary>Opciones</summary>
          <div className="arcade-theme-bar" aria-label="Opciones de MAME">
            <strong>Presentación</strong>
            <button
              aria-pressed={light}
              onClick={() => {
                setLight(!light)
                try {
                  localStorage.setItem('neo-vault.mame.light', String(!light))
                } catch {
                  /* Optional preference. */
                }
              }}
            >
              Modo ligero {light ? 'activado' : 'desactivado'}
            </button>
            <button
              aria-pressed={demo}
              onClick={() => {
                setDemo(!demo)
                setDemonstrating(false)
              }}
            >
              {demonstrating
                ? 'Demostración en curso'
                : `Demostración ${demo ? 'activada' : 'desactivada'}`}
            </button>
            <small>45 s de reposo · no inicia juegos</small>
            <label className="arcade-video-picker">
              Video del juego
              <input
                type="file"
                accept="video/mp4,video/webm"
                disabled={!selected || busy || running}
                aria-label="Elegir video local para el juego seleccionado"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file || !selected) return
                  if (!validArcadeVideo(file.name, file.size)) {
                    setNotice('Elige un video MP4 o WebM de hasta 100 MB.')
                    return
                  }
                  if (!videos[selected] && videoUrls.current.size >= 20) {
                    setNotice(
                      'Límite de 20 videos por sesión de catálogo. Vuelve a entrar para liberar los videos.'
                    )
                    return
                  }
                  const previous = videos[selected]
                  if (previous) {
                    URL.revokeObjectURL(previous)
                    videoUrls.current.delete(previous)
                  }
                  const url = URL.createObjectURL(file)
                  videoUrls.current.add(url)
                  setVideos((current) => ({ ...current, [selected]: url }))
                  setNotice(
                    'Video añadido para esta sesión de MAME, sin copiar el archivo. El modo ligero muestra solo la captura.'
                  )
                }}
              />
            </label>
            <strong>Biblioteca</strong>
            <button
              disabled={busy || running || !config}
              onClick={() => {
                void importLocal()
              }}
            >
              Añadir carpeta
            </button>
            <button
              disabled={busy || running || !config?.mamePath}
              onClick={() => {
                void audit(true)
              }}
            >
              Verificar colección
            </button>
            <button
              disabled={busy || running || !selected || !config?.mamePath}
              onClick={() => {
                void audit()
              }}
            >
              Verificar juego
            </button>
            <button
              disabled={busy || running || !config || !arcade}
              onClick={() => {
                const game = testTitle
                setQuery(game)
                setSelectedIndex(0)
                setOnlyLocal(false)
                setOnlyFavorites(false)
                if (optionsRef.current) optionsRef.current.open = false
                setOptionsOpen(false)
                void select(game)
              }}
            >
              {testTitle === finalFight
                ? 'Probar Final Fight'
                : testTitle === 'Gridlee'
                  ? 'Probar Gridlee'
                  : 'Probar Pong'}
            </button>
            {officialPage && (
              <button
                disabled={busy || running}
                onClick={() => {
                  void sourcePage()
                }}
              >
                Fuente oficial del juego
              </button>
            )}
            <a href="https://www.mamedev.org/roms/" target="_blank" rel="noreferrer">
              Juegos gratuitos de MAMEdev
            </a>
            <p>
              5: crédito · 1: iniciar · P/F5: pausa · Esc: salir · Tab: controles de este juego.
            </p>
            {arcadeGame && (
              <p>
                {arcadeGame.year} · {arcadeGame.manufacturer} ·{' '}
                {arcadeGame.status === 'preliminary'
                  ? 'Preliminar'
                  : arcadeGame.status === 'imperfect'
                    ? 'Emulación con limitaciones'
                    : 'Driver operativo'}
              </p>
            )}
          </div>
        </details>
      )}
      <div className="library-toolbar">
        {system.id === 'snes' && (
          <button
            className="secondary filter-button"
            onClick={() => {
              setQuery('Super Mario World')
              setSelectedIndex(0)
              setOnlyLocal(false)
              setOnlyFavorites(false)
            }}
          >
            Mario · referencias
          </button>
        )}
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
        {!isArcade && catalogSources[system.id] && (
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
        {!isArcade && (
          <span className="subtle">{filtered.length.toLocaleString('es')} resultados</span>
        )}
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
              {system.id === 'arcade' ? 'Mis juegos' : 'Archivos locales'}
            </button>
            {!isArcade && (
              <button
                className="secondary filter-button"
                disabled={busy || running || !config}
                onClick={() => {
                  void importLocal()
                }}
              >
                {system.id === 'arcade' ? 'Añadir carpeta' : 'Importar juego'}
              </button>
            )}
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
                {isArcade ? (
                  <ArcadePreview
                    key={`${selected}:${videos[selected] ?? ''}`}
                    game={selected}
                    video={videos[selected]}
                    light={light}
                  />
                ) : (
                  <GamePreview key={selected} game={selected} systemId={system.id} />
                )}
              </div>
              <div className="game-description">
                <span className="eyebrow">
                  {system.mark} / {status === 'sample' ? 'MUESTRA' : 'CATÁLOGO DE REFERENCIA'}
                </span>
                <h1 title={selected}>{selected}</h1>
                {!isArcade && (
                  <p className="game-association" title={bound}>
                    {arcadeGame?.romless
                      ? 'NO NECESITA ROM EXTERNA'
                      : bound
                        ? 'ARCHIVO LOCAL ASOCIADO'
                        : playable
                          ? 'SIN ARCHIVO LOCAL'
                          : 'EMULACIÓN PENDIENTE'}
                  </p>
                )}
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
                        : bound || arcadeGame?.romless
                          ? 'JUGAR'
                          : officialPage
                            ? 'VER DESCARGA OFICIAL'
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
                {playable && system.id !== 'arcade' && (
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
            {!isArcade && <span>SELECCIONA TU JUEGO</span>}
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
                  <span className="game-wheel-index">
                    <GameArtwork
                      key={`${system.id}:${game}`}
                      systemId={system.id}
                      game={game}
                      preferred="box"
                      compact
                    />
                  </span>
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
      {(!isArcade || notice) && (
        <div className="catalog-bottom" role="status">
          <span>
            {notice ||
              `${controlKeyLabel(navigation.up.key)} ${controlKeyLabel(navigation.down.key)} / Stick: navegar · ${controlKeyLabel(navigation.accept.key)}: seleccionar · ${controlKeyLabel(navigation.favorite.key)}: favorito · ${controlKeyLabel(navigation.back.key)}: volver`}
          </span>
          {notice && (
            <button onClick={() => setNotice('')} aria-label="Cerrar aviso">
              ×
            </button>
          )}
          <a
            href={
              isArcade
                ? 'https://www.mamedev.org/'
                : 'https://github.com/libretro/libretro-database'
            }
            target="_blank"
            rel="noreferrer"
          >
            Fuente
          </a>
        </div>
      )}
      {isArcade && (busy || running) && (
        <div className="arcade-launch-curtain" role="status">
          <strong>MAME</strong>
          <span>{running ? 'EN JUEGO' : 'PREPARANDO ARCADE…'}</span>
        </div>
      )}
    </main>
  )
}
