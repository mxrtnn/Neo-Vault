import { useEffect, useState } from 'react'
import logo from '../assets/branding/neo-vault.png'
import '../styles/branding.scss'

export default function StartupBrand(): React.JSX.Element | null {
  const [visible, setVisible] = useState(
    () => !matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    if (!visible) return
    const dismiss = (): void => setVisible(false)
    const timer = window.setTimeout(dismiss, 1700)
    window.addEventListener('keydown', dismiss, { once: true })
    window.addEventListener('vault-action', dismiss, { once: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', dismiss)
      window.removeEventListener('vault-action', dismiss)
    }
  }, [visible])
  if (!visible) return null
  return (
    <button
      className="startup-brand"
      aria-label="Omitir animación de inicio"
      onClick={() => setVisible(false)}
    >
      <img src={logo} alt="Neo-Vault" draggable={false} />
    </button>
  )
}
