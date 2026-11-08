import EmulationSettings from './components/EmulationSettings'
import { useEffect, useState } from 'react'
import { useInputDevices, useVaultAction } from './hooks/useInputDevices'
import GameLibrary from './components/GameLibrary'
import ConsoleImage from './components/ConsoleImage'
import { consoleImages } from './consoleImages'
import {
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Maximize2,
  Minimize2,
  Settings2,
  Users
} from 'lucide-react'

type Profile = { id: string; name: string; favorites: string[] }
type Vault = { profiles: Profile[]; active: string }
const systems = [
  {
    id: 'snes',
    name: 'SUPER NINTENDO',
    brand: 'NINTENDO',
    year: 1990,
    bits: '16-BIT',
    mark: 'SNES',
    color: '#ff3269',
    games: ['Super Mario World', 'Donkey Kong Country', 'The Legend of Zelda: A Link to the Past']
  },
  {
    id: 'n64',
    name: 'NINTENDO 64',
    brand: 'NINTENDO',
    year: 1996,
    bits: '64-BIT',
    mark: 'N64',
    color: '#49d894',
    games: ['Super Mario 64', 'Mario Kart 64', 'The Legend of Zelda: Ocarina of Time']
  },
  {
    id: 'nds',
    name: 'NINTENDO DS',
    brand: 'NINTENDO',
    year: 2004,
    bits: 'DUAL SCREEN',
    mark: 'NDS',
    color: '#b6bfff',
    games: ['New Super Mario Bros.', 'Mario Kart DS']
  },
  {
    id: 'genesis',
    name: 'SEGA MEGA DRIVE',
    brand: 'SEGA',
    year: 1988,
    bits: '16-BIT',
    mark: 'SEGA',
    color: '#52aaff',
    games: ['Sonic the Hedgehog', 'Streets of Rage 2']
  },
  {
    id: 'atari',
    name: 'ATARI 2600',
    brand: 'ATARI',
    year: 1977,
    bits: '8-BIT',
    mark: '2600',
    color: '#ffad57',
    games: ['Adventure', 'Asteroids']
  },
  {
    id: 'ps1',
    name: 'PLAYSTATION 1',
    brand: 'SONY',
    year: 1994,
    bits: '32-BIT',
    mark: 'PS1',
    color: '#9ca7ff',
    games: ['Crash Bandicoot', 'Tekken 3', 'Final Fantasy VII']
  },
  {
    id: 'nes',
    name: 'NINTENDO NES',
    brand: 'NINTENDO',
    year: 1983,
    bits: '8-BIT',
    mark: 'NES',
    color: '#ff5959',
    games: ['Super Mario Bros.', 'The Legend of Zelda', 'Metroid']
  },
  {
    id: 'gb',
    name: 'GAME BOY',
    brand: 'NINTENDO',
    year: 1989,
    bits: '8-BIT',
    mark: 'GB',
    color: '#a4ce75',
    games: ['Tetris', 'Pokemon Red', 'Super Mario Land']
  },
  {
    id: 'arcade',
    name: 'MAME / ARCADE',
    brand: 'ARCADE',
    year: 1997,
    bits: 'MULTI-SYSTEM',
    mark: 'MAME',
    color: '#bd87ff',
    games: ['Metal Slug', 'Street Fighter II']
  }
]
const initial: Vault = {
  profiles: [{ id: 'player-1', name: 'Jugador 1', favorites: [] }],
  active: 'player-1'
}
function readVault(): Vault {
  try {
    const data = JSON.parse(localStorage.getItem('neo-vault.profiles.v1') || 'null') as Vault | null
    if (
      data &&
      Array.isArray(data.profiles) &&
      data.profiles.length &&
      data.profiles.every(
        (p) =>
          typeof p.id === 'string' &&
          typeof p.name === 'string' &&
          Array.isArray(p.favorites) &&
          p.favorites.every((f) => typeof f === 'string')
      ) &&
      data.profiles.some((p) => p.id === data.active)
    )
      return data
  } catch {
    /* Keep the app usable if local storage is unavailable. */
  }
  return initial
}
export default function App(): React.JSX.Element {
  const input = useInputDevices()
  const [vault, setVault] = useState(readVault)
  const [page, setPage] = useState<'consoles' | 'games' | 'profiles' | 'settings'>('consoles')
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [name, setName] = useState('')

  const [storageError, setStorageError] = useState(false)
  const system = systems[index]
  const profile = vault.profiles.find((p) => p.id === vault.active)!
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
      try {
        localStorage.setItem('neo-vault.profiles.v1', JSON.stringify(vault))
        setStorageError(false)
      } catch {
        setStorageError(true)
      }
    })
    return () => {
      active = false
    }
  }, [vault])
  useVaultAction((action) => {
    if (page === 'games') return
    if (action === 'back') setPage('consoles')
    if (page !== 'consoles') return
    if (action === 'up' || action === 'left')
      setIndex((i) => (i - 1 + systems.length) % systems.length)
    if (action === 'down' || action === 'right') setIndex((i) => (i + 1) % systems.length)
    if (action === 'accept') setPage('games')
  })
  useEffect(() => {
    void window.api.getFullscreen().then(setFullscreen)
    return window.api.onFullscreenChanged(setFullscreen)
  }, [])
  useEffect(() => {
    if (page === 'consoles')
      document.getElementById(`system-${system.id}`)?.scrollIntoView({ block: 'nearest' })
  }, [index, page, system.id])
  function favorite(id: string): void {
    setVault((v) => ({
      ...v,
      profiles: v.profiles.map((p) =>
        p.id === v.active
          ? {
              ...p,
              favorites: p.favorites.includes(id)
                ? p.favorites.filter((f) => f !== id)
                : [...p.favorites, id]
            }
          : p
      )
    }))
  }
  return (
    <div className="vault-app">
      <header className="vault-header">
        <button className="brand" onClick={() => setPage('consoles')}>
          <span className="brand-logo">NV</span>
          <span>
            <strong>NEO-VAULT</strong>
            <small>RETRO GAMING PLATFORM</small>
          </span>
        </button>
        <nav aria-label="Navegación principal">
          <button
            className={page === 'consoles' || page === 'games' ? 'active' : ''}
            onClick={() => setPage('consoles')}
          >
            <Gamepad2 size={20} />
            Consolas
          </button>
          <button
            className={page === 'profiles' ? 'active' : ''}
            onClick={() => setPage('profiles')}
          >
            <Users size={20} />
            Perfiles
          </button>
          <button
            className={page === 'settings' ? 'active' : ''}
            onClick={() => setPage('settings')}
          >
            <Settings2 size={20} />
            Configuración
          </button>
        </nav>
        <button className="profile-chip" onClick={() => setPage('profiles')}>
          <span>{profile.name.slice(0, 1).toUpperCase()}</span>
          {profile.name}
        </button>
        <button
          className="display-toggle"
          onClick={() => {
            void window.api.setFullscreen(!fullscreen).then(setFullscreen)
          }}
          title="Cambiar modo de pantalla (F11)"
        >
          {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          <span>{fullscreen ? 'Modo ventana' : 'Pantalla completa'}</span>
        </button>
      </header>
      {storageError && (
        <p role="alert" className="notice">
          No se pudieron guardar los perfiles. Evita cerrar la aplicación hasta recuperar el
          almacenamiento.
        </p>
      )}
      {page === 'consoles' && (
        <main className="vault-selector">
          <section className="hero" key={system.id}>
            <div className="eyebrow">
              <span className="status-dot" /> TU PRÓXIMO VIAJE EMPIEZA AQUÍ
            </div>
            <div className="console-art" aria-hidden="true">
              <span className="orbit" />
              <span className="art-word">{system.mark}</span>
              <ConsoleImage key={system.id} systemId={system.id} />
              <span className="art-caption">THE CLASSICS NEVER FADE</span>
            </div>
            <div className="hero-copy">
              <span className="eyebrow">{system.brand}</span>
              <h1>{system.name}</h1>
              <p>{system.bits} ENTERTAINMENT SYSTEM</p>
              <div className="metadata">
                <div>
                  <small>LANZAMIENTO</small>
                  <strong>{system.year}</strong>
                </div>
                <div>
                  <small>COLECCIÓN</small>
                  <strong>POR CONFIGURAR</strong>
                </div>
              </div>
              <button
                className="primary"
                onClick={() => {
                  setPage('games')
                }}
              >
                <Gamepad2 size={21} />
                EXPLORAR SISTEMA
              </button>
            </div>
          </section>
          <section className="wheel" aria-label="Selector de consolas">
            <div className="section-heading">
              <span>SELECCIONA TU SISTEMA</span>
              <span>
                {String(index + 1).padStart(2, '0')} / {String(systems.length).padStart(2, '0')}
              </span>
            </div>
            <button
              className="wheel-arrow"
              aria-label="Consola anterior"
              onClick={() => setIndex((index - 1 + systems.length) % systems.length)}
            >
              <ChevronUp />
            </button>
            <div className="system-list">
              {systems.map((s, i) => (
                <button
                  key={s.id}
                  aria-pressed={index === i}
                  data-vault-item
                  id={`system-${s.id}`}
                  className={`system-card ${index === i ? 'selected' : ''}`}
                  onClick={() => setIndex(i)}
                >
                  <span className="system-icon">
                    <ConsoleImage key={s.id} systemId={s.id} />
                  </span>
                  <span>
                    <small>
                      {s.brand} · {s.year}
                    </small>
                    <strong>{s.name}</strong>
                  </span>
                  <span className="system-number">{String(i + 1).padStart(2, '0')}</span>
                </button>
              ))}
            </div>
            <button
              className="wheel-arrow"
              aria-label="Consola siguiente"
              onClick={() => setIndex((index + 1) % systems.length)}
            >
              <ChevronDown />
            </button>
          </section>
        </main>
      )}
      {page === 'games' && (
        <GameLibrary
          key={system.id}
          system={system}
          profileId={profile.id}
          favorites={profile.favorites}
          onFavorite={favorite}
          onBack={() => setPage('consoles')}
        />
      )}
      {page === 'profiles' && (
        <main className="content-page">
          <span className="eyebrow">TU ESPACIO EN NEO-VAULT</span>
          <h1>¿Quién juega hoy?</h1>
          <p>Cada perfil conserva sus favoritos en este equipo.</p>
          <div className="profiles">
            {vault.profiles.map((p) => (
              <button
                className={`profile-card ${p.id === vault.active ? 'selected' : ''}`}
                key={p.id}
                onClick={() => setVault((v) => ({ ...v, active: p.id }))}
              >
                <span className="avatar">{p.name.slice(0, 1).toUpperCase()}</span>
                <strong>{p.name}</strong>
                <small>
                  {p.favorites.length} favoritos ·{' '}
                  {p.id === vault.active ? 'Activo' : 'Seleccionar'}
                </small>
              </button>
            ))}
          </div>
          <form
            className="profile-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!name.trim()) return
              const id = crypto.randomUUID()
              setVault((v) => ({
                profiles: [...v.profiles, { id, name: name.trim(), favorites: [] }],
                active: id
              }))
              setName('')
            }}
          >
            <label htmlFor="profile-name">Crear un perfil</label>
            <div>
              <input
                id="profile-name"
                required
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del jugador"
              />
              <button className="primary">Crear perfil</button>
            </div>
          </form>
          <p className="subtle">
            La integración NES/SNES utiliza carpetas de guardado separadas por perfil. Los favoritos
            también son independientes.
          </p>
        </main>
      )}
      {page === 'settings' && (
        <main className="content-page">
          <span className="eyebrow">CENTRO DE CONTROL</span>
          <h1>Configuración</h1>
          <EmulationSettings />
          <div className="settings-panel">
            <Settings2 size={32} />
            <h2>Controles</h2>
            <p>
              Teclado: flechas para navegar, Enter para seleccionar, Esc para volver y F para
              favoritos. Mando estándar: cruceta o stick, A para seleccionar, B para volver y Y para
              favoritos; LB/RB avanza diez juegos.
            </p>
            <p>
              Conecta o empareja el mando en Windows y presiona un botón con Neo-Vault enfocado. La
              conexión USB o Bluetooth la gestiona Windows.
            </p>
            <p role="status">
              {input.name
                ? `Mando: ${input.name}`
                : 'No se detecta un mando. Presiona un botón para activarlo.'}
            </p>
            <p>
              {input.name && !input.standard
                ? 'Este mando no informa un mapeo estándar; la navegación automática está desactivada para evitar controles incorrectos.'
                : 'Compatible con mandos que el navegador identifica con mapeo estándar.'}
            </p>
            <p>Prueba de controles: {input.lastAction}</p>
            <h2>Preparando tu colección</h2>
            <p>
              Puedes conectar RetroArch para NES y SNES arriba. El catálogo de las demás consolas es
              de referencia; MAME conserva títulos de muestra.
            </p>
            <p>
              Los favoritos se guardan automáticamente por perfil en este equipo. La estética está
              inspirada en HyperSpin; su motor no forma parte de la aplicación.
            </p>
            <h3>Catálogo en línea</h3>
            <p>
              Listas de Libretro basadas en No-Intro y Redump, con regiones y revisiones. No se
              garantiza que contengan todos los juegos existentes. No incluyen archivos de juegos.
              MAME permanece como selección de muestra.
            </p>
            <h3>Créditos de imágenes</h3>
            <p>
              Vistas previas de juegos: libretro-thumbnails (cuando existe una coincidencia de
              nombre).
            </p>
            <p>
              <a
                href="https://creativecommons.org/licenses/by-sa/2.0/"
                target="_blank"
                rel="noreferrer"
              >
                Licencia de la imagen arcade: CC BY-SA 2.0
              </a>
            </p>
            <p>
              Consolas: fotografías de Evan-Amos / Wikimedia Commons (dominio público). Arcade:
              Joshua Driggs (ZapWizard), fondo retirado por bayo y transparencia por Shooke; CC
              BY-SA 2.0. Sin modificaciones adicionales. Las imágenes se cargan desde internet; la
              caché depende del navegador integrado y no garantiza disponibilidad sin conexión.
            </p>
            <ul>
              {Object.entries(consoleImages).map(([id, image]) => (
                <li key={id}>
                  <a href={image.source} target="_blank" rel="noreferrer">
                    {systems.find((s) => s.id === id)?.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </main>
      )}
      <footer className="vault-footer">
        <span>
          <b>NEO-VAULT</b> · {page === 'games' ? 'GAME LIBRARY' : 'SYSTEM SELECTOR'}
        </span>
        <span>
          ↑ ↓ / Stick Navegar <kbd>Enter</kbd> Explorar <kbd>Esc</kbd> Volver
        </span>
        <span title={input.name || 'Conecta un mando y presiona un botón'}>
          {input.name ? (input.standard ? 'MANDO CONECTADO' : 'MANDO SIN MAPEO') : 'TECLADO'} ·
          v0.1.0
        </span>
      </footer>
    </div>
  )
}
