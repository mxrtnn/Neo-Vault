import { Gamepad2, Settings2 } from 'lucide-react'

export default function SiteHeader(): React.JSX.Element {
  return (
    <header className="site-header">
      <div className="site-header__brand">
        <span className="site-header__logo">NV</span>

        <div>
          <strong>NEO-VAULT</strong>
          <small>RETRO GAMING PLATFORM</small>
        </div>
      </div>

      <nav className="site-header__nav">
        <span className="site-header__active">
          <Gamepad2 size={17} />
          Consolas
        </span>
        <span>
          <Settings2 size={17} />
          Configuración
        </span>
      </nav>

      <span className="site-header__version">v0.1.0</span>
    </header>
  )
}
