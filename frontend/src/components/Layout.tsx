import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { useLogout, useUsuarioAtual } from '../api/hooks'
import { BuscaGlobal, type BuscaGlobalRef } from './BuscaGlobal'
import { Logo } from './ui'

type ItemMenu = { to: string; label: string; end?: boolean; admin?: boolean }

const linksBase: ItemMenu[] = [
  { to: '/', label: 'Início', end: true },
  { to: '/pombos', label: 'Meus pombos' },
  { to: '/reprodutores', label: 'Reprodutores' },
  { to: '/proprietarios', label: 'Proprietários' },
  { to: '/compartilhar', label: 'Compartilhar' },
]

function iniciais(nome?: string) {
  return (nome ?? '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Menu superior azul-marinho (NV-01), gaveta no celular (NV-02) e busca global (NV-03). */
export function Layout({ children }: { children: ReactNode }) {
  const [gaveta, setGaveta] = useState(false)
  const [buscaCelular, setBuscaCelular] = useState(false)
  const [menuUsuario, setMenuUsuario] = useState(false)
  const { data: usuario } = useUsuarioAtual()
  const logout = useLogout()
  const busca = useRef<BuscaGlobalRef>(null)
  const buscaCel = useRef<BuscaGlobalRef>(null)
  const links: ItemMenu[] = usuario?.admin ? [...linksBase, { to: '/usuarios', label: 'Usuários', admin: true }] : linksBase

  // NV-03: "/" leva à busca, a não ser que já se esteja digitando
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement
      if (e.key === 'Escape') {
        setGaveta(false)
        setMenuUsuario(false)
      }
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      if (alvo.closest('input, textarea, select, [contenteditable=true]')) return
      e.preventDefault()
      if (window.matchMedia('(min-width: 640px)').matches) busca.current?.focar()
      else setBuscaCelular(true)
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [])

  useEffect(() => {
    if (buscaCelular) buscaCel.current?.focar()
  }, [buscaCelular])

  const classeItem = ({ isActive }: { isActive: boolean }) =>
    `relative whitespace-nowrap rounded-lg px-2.5 py-2 font-medium transition-colors ${
      isActive
        ? "text-white after:absolute after:inset-x-2.5 after:-bottom-[14px] after:h-[3px] after:rounded-t after:bg-dourado"
        : 'text-menu-texto hover:bg-white/10 hover:text-white'
    }`

  return (
    <div className="min-h-screen bg-fundo">
      <header className="sticky top-0 z-30 bg-marinho">
        <div className="mx-auto flex h-[58px] max-w-[1240px] items-center gap-2 px-3 sm:h-16 sm:gap-5 sm:px-6">
          <Link to="/" aria-label="Pedigree Colombófilo — início" onClick={() => setGaveta(false)} className="shrink-0 rounded-lg">
            <Logo />
          </Link>

          <nav aria-label="Principal" className="hidden min-w-0 flex-1 gap-0 xl:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={classeItem}>
                {l.label}
                {l.admin && (
                  <span className="ml-1.5 rounded bg-dourado/20 px-1 align-[1px] text-[10px] font-semibold text-dourado">admin</span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden w-60 shrink-0 sm:block">
            <BuscaGlobal ref={busca} />
          </div>

          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setMenuUsuario((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuUsuario}
              aria-label={`Conta de ${usuario?.nome ?? ''}`}
              className="grid h-9 w-9 place-items-center rounded-full bg-dourado text-[13px] font-bold text-marinho"
            >
              {iniciais(usuario?.nome)}
            </button>
            {menuUsuario && (
              <div role="menu" className="absolute right-0 top-12 z-40 w-56 rounded-xl border border-borda-suave bg-white p-1.5 shadow-2xl">
                <div className="px-3 py-2">
                  <p className="font-semibold text-slate-900">{usuario?.nome}</p>
                  <p className="text-xs text-slate-500">{usuario?.login}</p>
                </div>
                <button role="menuitem" type="button" onClick={() => logout.mutate()} className="w-full rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-fundo">
                  Sair
                </button>
              </div>
            )}
          </div>

          {/* celular e tablet */}
          <button
            type="button"
            onClick={() => setBuscaCelular(true)}
            aria-label="Buscar pombo pela anilha"
            className="ml-auto grid h-11 w-11 place-items-center rounded-lg text-white sm:hidden"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-[21px] w-[21px]"><g fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></g></svg>
          </button>
          <button
            type="button"
            onClick={() => setGaveta((v) => !v)}
            aria-label={gaveta ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={gaveta}
            aria-controls="gaveta-menu"
            className="grid h-11 w-11 place-items-center rounded-lg text-white xl:hidden"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-[22px] w-[22px]">
              <path d={gaveta ? 'M6 6l12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h16'} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {buscaCelular && (
          <div className="absolute inset-x-0 top-0 z-40 flex h-[58px] items-center gap-2 bg-marinho px-3 sm:hidden">
            <BuscaGlobal ref={buscaCel} aoAbrir={() => setBuscaCelular(false)} />
            <button type="button" onClick={() => setBuscaCelular(false)} className="h-11 px-2 font-medium text-white">
              Cancelar
            </button>
          </div>
        )}

        {gaveta && (
          <nav id="gaveta-menu" aria-label="Menu" className="border-t border-white/10 bg-marinho px-2.5 pb-3.5 pt-1.5 shadow-2xl xl:hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setGaveta(false)}
                className={({ isActive }) =>
                  `flex h-12 items-center rounded-lg px-3 font-medium ${isActive ? 'bg-dourado text-marinho' : 'text-menu-texto hover:bg-white/10'}`
                }
              >
                {l.label}
                {l.admin && ' (admin)'}
              </NavLink>
            ))}
            <div className="mt-2 flex items-center gap-3 border-t border-white/10 px-3 pt-3 text-white sm:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-dourado text-[13px] font-bold text-marinho">{iniciais(usuario?.nome)}</span>
              <div className="flex-1">
                <p className="font-semibold">{usuario?.nome}</p>
                <p className="text-xs text-menu-texto">{usuario?.login}</p>
              </div>
              <button type="button" onClick={() => logout.mutate()} className="h-11 rounded-lg border border-white/25 px-4 font-medium">
                Sair
              </button>
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-[1240px] px-3.5 py-4 sm:px-6 sm:py-6">{children}</main>
    </div>
  )
}
