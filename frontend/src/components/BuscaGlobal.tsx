import { useQuery } from '@tanstack/react-query'
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../api/client'
import type { Pombo } from '../api/types'
import { NOME_SEXO } from './ui'

const MAX_RESULTADOS = 8
const SIMBOLO = { M: '♂', F: '♀', DESCONHECIDO: '?' } as const

export type BuscaGlobalRef = { focar: () => void }

/** Busca por anilha no topo (NV-03 a NV-05). Combobox acessível: ↑ ↓ Enter Esc. */
export const BuscaGlobal = forwardRef<BuscaGlobalRef, { escura?: boolean; grande?: boolean; aoAbrir?: () => void }>(function BuscaGlobal(
  { escura = true, grande = false, aoAbrir },
  ref,
) {
  const [texto, setTexto] = useState('')
  const [termo, setTermo] = useState('')
  const [selecionado, setSelecionado] = useState(0)
  const [aberto, setAberto] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const idLista = useId()

  useImperativeHandle(ref, () => ({ focar: () => entrada.current?.focus() }), [])

  // espera a pessoa parar de digitar antes de ir ao servidor
  useEffect(() => {
    const t = setTimeout(() => setTermo(texto.trim()), 200)
    return () => clearTimeout(t)
  }, [texto])

  const { data: achados = [], isFetching } = useQuery({
    queryKey: ['busca-anilha', termo],
    queryFn: async () => (await api.get<Pombo[]>('/pombos', { params: { anilha: termo } })).data.slice(0, MAX_RESULTADOS),
    enabled: termo.length > 0,
    staleTime: 10_000,
  })

  const anilhaValida = /^[0-9/]+$/.test(termo)
  const semResultado = termo.length > 0 && !isFetching && achados.length === 0
  const opcoes = semResultado ? (anilhaValida ? 1 : 0) : achados.length
  const mostrar = aberto && texto.trim().length > 0 && termo === texto.trim()

  function limpar() {
    setTexto('')
    setTermo('')
    setAberto(false)
    setSelecionado(0)
  }

  function escolher(i: number) {
    if (semResultado) {
      if (!anilhaValida) return
      navigate(`/pombos/novo?anilha=${encodeURIComponent(termo)}`)
    } else {
      const p = achados[i]
      if (!p) return
      navigate(`/pombos/${p.id}`)
    }
    limpar()
    entrada.current?.blur()
    aoAbrir?.()
  }

  return (
    <div className="relative w-full">
      <svg aria-hidden viewBox="0 0 24 24" className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${escura ? 'text-[#a9b6cc]' : 'text-slate-400'}`}>
        <g fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></g>
      </svg>
      <input
        ref={entrada}
        type="search"
        role="combobox"
        aria-label="Buscar pombo pela anilha"
        aria-expanded={mostrar}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={mostrar && opcoes > 0 ? `${idLista}-${selecionado}` : undefined}
        autoComplete="off"
        placeholder={grande ? 'Digite a anilha (ex.: 4272402)' : 'Buscar anilha…'}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setSelecionado(0)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (opcoes) setSelecionado((s) => (s + (e.key === 'ArrowDown' ? 1 : -1) + opcoes) % opcoes)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            if (mostrar) escolher(selecionado)
          } else if (e.key === 'Escape') {
            limpar()
            entrada.current?.blur()
          }
        }}
        className={`${grande ? 'h-12 text-base' : 'h-10'} w-full rounded-[10px] border pl-10 pr-10 focus:outline-none ${
          escura
            ? 'border-white/20 bg-white/10 text-white placeholder:text-[#a9b6cc] focus:border-dourado focus:bg-white focus:text-slate-900 focus:ring-3 focus:ring-dourado/35'
            : 'border-transparent bg-white shadow-sm focus:border-link focus:ring-3 focus:ring-blue-100'
        }`}
      />
      <kbd aria-hidden className={`pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border px-1.5 font-mono text-[11px] ${texto ? '' : 'sm:block'} ${escura ? 'border-white/25 text-[#a9b6cc]' : 'border-borda text-slate-400'}`}>
        /
      </kbd>
      {mostrar && (
        <ul id={idLista} role="listbox" aria-label="Resultados da busca" className="absolute inset-x-0 top-12 z-40 min-w-72 overflow-hidden rounded-xl border border-borda-suave bg-white py-1 text-slate-900 shadow-2xl">
          {semResultado ? (
            anilhaValida ? (
              <li id={`${idLista}-0`} role="option" aria-selected onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(0)} className="flex cursor-pointer justify-between gap-3 bg-blue-50 px-4 py-2.5">
                <span>Nenhum pombo com <b>{termo}</b></span>
                <span className="font-semibold text-link">+ Cadastrar</span>
              </li>
            ) : (
              <li className="px-4 py-2.5 text-slate-600">Nenhum pombo com “{termo}”. A anilha tem só números e /.</li>
            )
          ) : (
            achados.map((p, i) => (
              <li
                key={p.id}
                id={`${idLista}-${i}`}
                role="option"
                aria-selected={i === selecionado}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setSelecionado(i)}
                onClick={() => escolher(i)}
                className={`flex cursor-pointer justify-between gap-3 px-4 py-2.5 ${i === selecionado ? 'bg-blue-50' : ''}`}
              >
                <b className="tabular-nums">{p.anilha}</b>
                <span className="text-sm text-slate-600">
                  {SIMBOLO[p.sexo]} {NOME_SEXO[p.sexo]} · {p.cor || '—'}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
})
