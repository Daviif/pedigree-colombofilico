import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/pombos', label: 'Pombos' },
  { to: '/reprodutores', label: 'Reprodutores' },
  { to: '/proprietarios', label: 'Proprietários' },
]

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <span className="text-lg font-semibold text-slate-800">🐦 Pedigree Colombófilo</span>
          <nav className="flex gap-4 text-sm font-medium text-slate-600">
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
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
