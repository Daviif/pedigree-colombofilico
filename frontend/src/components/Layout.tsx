import { type ReactNode, useState } from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/pombos', label: 'Pombos' },
  { to: '/reprodutores', label: 'Reprodutores' },
  { to: '/proprietarios', label: 'Proprietários' },
]

export function Layout({ children }: { children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-3 sm:justify-start">
          <span className="text-lg font-semibold text-slate-800">🐦 Pedigree Colombófilo</span>
          <nav className="hidden gap-4 text-sm font-medium text-slate-600 sm:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  isActive ? 'text-blue-700' : 'hover:text-slate-900'
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            className="-mr-2 rounded p-2 text-2xl leading-none text-slate-700 hover:bg-slate-100 sm:hidden"
          >
            {menuAberto ? '✕' : '☰'}
          </button>
        </div>
        {menuAberto && (
          <nav className="border-t border-slate-100 px-2 pb-2 sm:hidden">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMenuAberto(false)}
                className={({ isActive }) =>
                  `block rounded px-3 py-3 text-base font-medium ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-4 sm:py-6">{children}</main>
    </div>
  )
}
