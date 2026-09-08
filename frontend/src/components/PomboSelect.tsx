import { useEffect, useRef, useState } from 'react'

import { useCriarPombo, useProprietarios } from '../api/hooks'
import type { Pombo, Sexo } from '../api/types'

export function PomboSelect({
  pombos,
  value,
  onChange,
  excludeId,
  label,
  sexoPadrao,
}: {
  pombos: Pombo[]
  value: number | null | undefined
  onChange: (id: number | undefined) => void
  excludeId?: number
  label: string
  sexoPadrao?: Sexo
}) {
  const selecionado = pombos.find((p) => p.id === value)
  const [query, setQuery] = useState('')
  const [aberto, setAberto] = useState(false)
  const [modoCriar, setModoCriar] = useState(false)
  const [novaAnilha, setNovaAnilha] = useState('')
  const [novoSexo, setNovoSexo] = useState<Sexo>(sexoPadrao ?? 'DESCONHECIDO')
  const [novaCor, setNovaCor] = useState('')
  const [novoProprietarioId, setNovoProprietarioId] = useState<number | undefined>(undefined)
  const [erroCriar, setErroCriar] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const criar = useCriarPombo()
  const { data: proprietarios } = useProprietarios()

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
        setModoCriar(false)
      }
    }
    document.addEventListener('mousedown', aoClicarFora, true)
    return () => document.removeEventListener('mousedown', aoClicarFora, true)
  }, [])

  const opcoes = pombos.filter(
    (p) => p.id !== excludeId && p.anilha.toLowerCase().includes(query.toLowerCase()),
  )

  function selecionar(id: number | undefined) {
    onChange(id)
    setQuery('')
    setAberto(false)
    setModoCriar(false)
  }

  function abrirCriacao() {
    setErroCriar(null)
    setNovaAnilha(query)
    setNovaCor('')
    setNovoSexo(sexoPadrao ?? 'DESCONHECIDO')
    setNovoProprietarioId(undefined)
    setModoCriar(true)
  }

  async function criarRapido() {
    if (!novaAnilha.trim()) {
      setErroCriar('Informe a anilha.')
      return
    }
    setErroCriar(null)
    try {
      const criado = await criar.mutateAsync({
        anilha: novaAnilha,
        sexo: novoSexo,
        cor: novaCor || null,
        status: 'ATIVO',
        observacoes: null,
        origem: null,
        proprietario_id: novoProprietarioId,
        pai_id: undefined,
        mae_id: undefined,
      })
      selecionar(criado.id)
    } catch (err: any) {
      setErroCriar(err?.response?.data?.detail ?? 'Erro ao cadastrar pombo.')
    }
  }

  const textoExibido = selecionado
    ? `${selecionado.anilha}${selecionado.cor ? ` — ${selecionado.cor}` : ''}`
    : query

  return (
    <div className="relative" ref={containerRef}>
      <input
        placeholder={`Buscar ${label.toLowerCase()} por anilha...`}
        value={aberto ? query : textoExibido}
        onFocus={() => {
          setAberto(true)
          setModoCriar(false)
          setQuery('')
        }}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
      />
      {aberto && !modoCriar && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border border-slate-300 bg-white shadow-lg">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              selecionar(undefined)
            }}
            className="block w-full px-2 py-1 text-left text-sm text-slate-500 hover:bg-slate-100"
          >
            Não cadastrado(a) no sistema
          </button>
          {opcoes.map((p) => (
            <button
              type="button"
              key={p.id}
              onMouseDown={(e) => {
                e.preventDefault()
                selecionar(p.id)
              }}
              className="block w-full px-2 py-1 text-left text-sm hover:bg-slate-100"
            >
              {p.anilha} {p.cor ? `— ${p.cor}` : ''}
            </button>
          ))}
          {opcoes.length === 0 && (
            <div className="px-2 py-1 text-sm text-slate-400">Nenhum pombo encontrado</div>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              abrirCriacao()
            }}
            className="block w-full border-t border-slate-100 px-2 py-1.5 text-left text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            + Cadastrar {label.toLowerCase()} agora
          </button>
        </div>
      )}
      {aberto && modoCriar && (
        // Não é um <form>: este painel fica dentro do <form> do cadastro do pombo
        // principal, e formulários HTML não podem ser aninhados.
        <div className="absolute z-10 mt-1 w-full space-y-2 rounded border border-slate-300 bg-white p-3 shadow-lg">
          {erroCriar && <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{erroCriar}</div>}
          <input
            autoFocus
            placeholder="Anilha *"
            value={novaAnilha}
            onChange={(e) => setNovaAnilha(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                criarRapido()
              }
            }}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={novoSexo}
              onChange={(e) => setNovoSexo(e.target.value as Sexo)}
              className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="DESCONHECIDO">Desconhecido</option>
              <option value="M">Macho</option>
              <option value="F">Fêmea</option>
            </select>
            <input
              placeholder="Cor"
              value={novaCor}
              onChange={(e) => setNovaCor(e.target.value)}
              className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <select
            value={novoProprietarioId ?? ''}
            onChange={(e) => setNovoProprietarioId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="">Sem proprietário definido</option>
            {proprietarios?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={criar.isPending}
              onMouseDown={(e) => {
                e.preventDefault()
                criarRapido()
              }}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Cadastrar e vincular
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                setModoCriar(false)
              }}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
