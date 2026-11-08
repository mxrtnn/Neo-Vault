import { useState } from 'react'
import { ChevronUp, ChevronDown, Gamepad2 } from 'lucide-react'

const consoles = [
  { id: 'snes', name: 'SUPER NINTENDO', year: 1990, bits: '16-BIT', brand: 'NINTENDO' },
  { id: 'n64', name: 'NINTENDO 64', year: 1996, bits: '64-BIT', brand: 'NINTENDO' },
  { id: 'ps1', name: 'PLAYSTATION 1', year: 1994, bits: '32-BIT', brand: 'SONY' },
  { id: 'genesis', name: 'SEGA MEGA DRIVE', year: 1988, bits: '16-BIT', brand: 'SEGA' },
  { id: 'gba', name: 'GAME BOY ADVANCE', year: 2001, bits: '32-BIT', brand: 'NINTENDO' },
  { id: 'arcade', name: 'MAME / ARCADE', year: 1997, bits: 'MULTI-SYSTEM', brand: 'ARCADE' }
]

export default function ConsolesPage(): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selected = consoles[selectedIndex]

  const navigate = (direction: number): void => {
    setSelectedIndex((current) => (current + direction + consoles.length) % consoles.length)
  }

  return (
    <main className="consoles-page">
      <section className="console-detail">
        <span className="eyebrow">SYSTEM REPOSITORY // ACTIVE</span>

        <div className="console-detail__content">
          <span className="console-detail__brand">{selected.brand}</span>
          <h1>{selected.name}</h1>
          <p>{selected.bits} ENTERTAINMENT SYSTEM</p>

          <div className="console-detail__metadata">
            <div>
              <small>LANZAMIENTO</small>
              <strong>{selected.year}</strong>
            </div>
            <div>
              <small>ESTADO</small>
              <strong>DISPONIBLE</strong>
            </div>
          </div>

          <div className="console-detail__action">
            <Gamepad2 size={18} />
            <span>EXPLORAR SISTEMA</span>
          </div>
        </div>
      </section>

      <section className="console-selector">
        <div className="console-selector__heading">
          <h2>NEOWHEEL SELECTOR</h2>
          <span>
            {String(selectedIndex + 1).padStart(2, '0')} / {consoles.length}
          </span>
        </div>

        <button
          type="button"
          className="wheel-control"
          onClick={() => navigate(-1)}
          aria-label="Consola anterior"
        >
          <ChevronUp size={20} />
        </button>

        <div className="console-selector__list">
          {consoles.map((consoleItem, index) => (
            <button
              type="button"
              key={consoleItem.id}
              className={`console-item ${index === selectedIndex ? 'console-item--active' : ''}`}
              onClick={() => setSelectedIndex(index)}
            >
              <span className="console-item__number">{String(index + 1).padStart(2, '0')}</span>

              <span className="console-item__name">{consoleItem.name}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="wheel-control"
          onClick={() => navigate(1)}
          aria-label="Consola siguiente"
        >
          <ChevronDown size={20} />
        </button>
      </section>
    </main>
  )
}
