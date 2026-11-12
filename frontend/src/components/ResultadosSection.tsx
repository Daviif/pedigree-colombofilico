import { useState } from 'react'

import { mensagemDeErro, useCriarResultado, useRemoverResultado, useResultados } from '../api/hooks'
import { FalhaAoCarregar } from './FalhaAoCarregar'

export function ResultadosSection({
  pomboId,
  somenteLeitura = false,
}: {
  pomboId: number
  somenteLeitura?: boolean
}) {
  const { data: resultados, isError, error, refetch } = useResultados(pomboId)
  const criar = useCriarResultado(pomboId)
  const remover = useRemoverResultado(pomboId)
  const [competicao, setCompeticao] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!competicao.trim()) return
    setErro(null)
    try {
      await criar.mutateAsync({
        ano: undefined,
        competicao,
        distancia_km: undefined,
        colocacao: null,
        premio: null,
        observacao: null,
      })
      setCompeticao('')
    } catch (err) {
      setErro(mensagemDeErro(err, 'Erro ao adicionar o resultado.'))
    }
  }

  async function removerResultado(id: number) {
    setErro(null)
    try {
      await remover.mutateAsync(id)
    } catch (err) {
      setErro(mensagemDeErro(err, 'Erro ao remover o resultado.'))
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-lg font-medium text-slate-800">Resultados / títulos</h2>

      {!somenteLeitura && (
        <form onSubmit={adicionar} className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            required
            placeholder="ex: 2021 — Prova Navarro 438 Km — 1º lugar"
            className="flex-1 rounded border border-slate-300 px-2 py-2 text-sm sm:py-1"
            value={competicao}
            onChange={(e) => setCompeticao(e.target.value)}
          />
          <button
            type="submit"
            disabled={criar.isPending}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm sm:py-1 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Adicionar
          </button>
        </form>
      )}

      {erro && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
      {isError && <FalhaAoCarregar erro={error} oQue="os resultados" onTentar={refetch} />}
      {resultados?.length === 0 && <p className="text-sm text-slate-500">Nenhum resultado registrado.</p>}

      <ul className="divide-y divide-slate-100">
        {resultados?.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-3 py-2 text-sm">
            <div>
              {r.ano && <span className="font-medium">{r.ano} — </span>}
              {r.competicao}
              {r.distancia_km ? ` (${r.distancia_km} km)` : ''}
              {r.colocacao ? ` · ${r.colocacao}` : ''}
              {r.premio ? ` · ${r.premio}` : ''}
              {r.observacao && <div className="whitespace-pre-line text-slate-400">{r.observacao}</div>}
            </div>
            {!somenteLeitura && (
              <button onClick={() => removerResultado(r.id)} className="shrink-0 py-1 text-xs text-red-600 hover:underline">
                remover
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
