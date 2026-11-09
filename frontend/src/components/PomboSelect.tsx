import { useEffect, useId, useRef, useState } from 'react'

import { mensagemDeErro, useCriarPombo, useProprietarios } from '../api/hooks'
import type { Pombo, Sexo } from '../api/types'
import type { PropsControle } from './ui'
import { classeBotao, classeEntrada } from './ui'
import { capitalizarPrimeira, limparAnilha } from '../formatadores'

export function PomboSelect({
  pombos,
  value,
  onChange,
  excludeId,
  label,
  sexoPadrao,
  permitirCriar = true,
  controle,
  invalido = false,
}: {
  pombos: Pombo[]
  value: number | null | undefined
  onChange: (id: number | undefined) => void
  excludeId?: number
  label: string
  sexoPadrao?: Sexo
  // O cadastro rápido sempre cria no plantel do usuário logado.
  permitirCriar?: boolean
  /** Liga o campo ao rótulo/erro do Campo (acessibilidade). */
  controle?: PropsControle
  invalido?: boolean
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
  const [ativo, setAtivo] = useState(0)
  const idLista = useId()
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

  // RF-03: pai só macho ou desconhecido; mãe só fêmea ou desconhecido (o servidor
  // também valida, RG-04). sexoPadrao indica o papel: "M" = pai, "F" = mãe.
  const sexosPermitidos: Sexo[] | undefined = sexoPadrao ? [sexoPadrao, 'DESCONHECIDO'] : undefined
  const opcoes = pombos.filter(
    (p) =>
      p.id !== excludeId &&
      (!sexosPermitidos || sexosPermitidos.includes(p.sexo)) &&
      p.anilha.toLowerCase().includes(query.toLowerCase()),
  )

  function selecionar(id: number | undefined) {
    onChange(id)
    setQuery('')
    setAberto(false)
    setModoCriar(false)
  }

  function abrirCriacao() {
    setErroCriar(null)
    setNovaAnilha(limparAnilha(query))
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
    } catch (err) {
      setErroCriar(mensagemDeErro(err, 'Erro ao cadastrar pombo.'))
    }
  }

  // Itens navegáveis pelo teclado, na ordem em que aparecem (sistema visual §6: combobox).
  const itens: { chave: string; executar: () => void }[] = [
    { chave: 'nenhum', executar: () => selecionar(undefined) },
    ...opcoes.map((p) => ({ chave: String(p.id), executar: () => selecionar(p.id) })),
    ...(permitirCriar ? [{ chave: 'criar', executar: abrirCriacao }] : []),
  ]
  const listaAberta = aberto && !modoCriar

  function teclado(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!listaAberta) {
        setAberto(true)
        setModoCriar(false)
        return
      }
      setAtivo((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length)
    } else if (e.key === 'Enter' && listaAberta) {
      e.preventDefault() // não envia o formulário
      itens[Math.min(ativo, itens.length - 1)]?.executar()
    } else if (e.key === 'Escape' && (aberto || modoCriar)) {
      e.stopPropagation()
      setAberto(false)
      setModoCriar(false)
    }
  }

  const opcaoId = (i: number) => `${idLista}-${i}`
  const classeOpcao = (i: number) =>
    `block w-full min-h-11 cursor-pointer px-3 py-2 text-left text-sm sm:min-h-0 ${i === ativo ? 'bg-blue-50' : 'hover:bg-slate-100'}`

  const textoExibido = selecionado
    ? `${selecionado.anilha}${selecionado.cor ? ` — ${selecionado.cor}` : ''}`
    : query

  return (
    <div className="relative" ref={containerRef}>
      <input
        {...controle}
        role="combobox"
        aria-expanded={listaAberta}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={listaAberta ? opcaoId(Math.min(ativo, itens.length - 1)) : undefined}
        onKeyDown={teclado}
        autoComplete="off"
        placeholder={`Buscar ${label.toLowerCase()} por anilha…`}
        value={aberto ? query : textoExibido}
        onFocus={() => {
          setAberto(true)
          setModoCriar(false)
          setQuery('')
          setAtivo(0)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setAtivo(e.target.value ? 1 : 0)
          setAberto(true)
        }}
        className={classeEntrada(invalido)}
      />
      {aberto && !modoCriar && (
        <div id={idLista} role="listbox" aria-label={`Escolher ${label}`} className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-[10px] border border-borda-suave bg-white shadow-xl">
          <div
            id={opcaoId(0)}
            role="option"
            aria-selected={value == null}
            onMouseDown={(e) => {
              e.preventDefault()
              selecionar(undefined)
            }}
            className={`${classeOpcao(0)} text-slate-500`}
          >
            Não cadastrado(a) no sistema
          </div>
          {opcoes.map((p, i) => (
            <div
              key={p.id}
              id={opcaoId(i + 1)}
              role="option"
              aria-selected={value === p.id}
              onMouseDown={(e) => {
                e.preventDefault()
                selecionar(p.id)
              }}
              className={classeOpcao(i + 1)}
            >
              {p.anilha} {p.cor ? `— ${p.cor}` : ''}
            </div>
          ))}
          {opcoes.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">Nenhum pombo encontrado</div>
          )}
          {permitirCriar && (
            <div
              id={opcaoId(itens.length - 1)}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault()
                abrirCriacao()
              }}
              className={`${classeOpcao(itens.length - 1)} border-t border-borda-suave font-semibold text-link`}
            >
              + Cadastrar {label.toLowerCase()} agora
            </div>
          )}
        </div>
      )}
      {aberto && modoCriar && (
        // Não é um <form>: este painel fica dentro do <form> do cadastro do pombo
        // principal, e formulários HTML não podem ser aninhados.
        <div className="absolute z-10 mt-1 w-full space-y-2 rounded-[10px] border border-borda-suave bg-white p-3 shadow-xl">
          {erroCriar && <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{erroCriar}</div>}
          <input
            autoFocus
            placeholder="Anilha *"
            value={novaAnilha}
            onChange={(e) => setNovaAnilha(limparAnilha(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                criarRapido()
              }
            }}
            className={classeEntrada()}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={novoSexo}
              onChange={(e) => setNovoSexo(e.target.value as Sexo)}
              className={`min-w-0 flex-1 ${classeEntrada()}`}
            >
              <option value="DESCONHECIDO">Desconhecido</option>
              {(!sexosPermitidos || sexosPermitidos.includes('M')) && <option value="M">Macho</option>}
              {(!sexosPermitidos || sexosPermitidos.includes('F')) && <option value="F">Fêmea</option>}
            </select>
            <input
              placeholder="Cor"
              value={novaCor}
              onChange={(e) => setNovaCor(capitalizarPrimeira(e.target.value))}
              className={`min-w-0 flex-1 ${classeEntrada()}`}
            />
          </div>
          <select
            value={novoProprietarioId ?? ''}
            onChange={(e) => setNovoProprietarioId(e.target.value ? Number(e.target.value) : undefined)}
            className={classeEntrada()}
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
              className={classeBotao("escura", true)}
            >
              Cadastrar e vincular
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                setModoCriar(false)
              }}
              className={classeBotao("secundaria", true)}
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
