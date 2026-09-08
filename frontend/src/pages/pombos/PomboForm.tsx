import { type ReactNode, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  useAtualizarPombo,
  useCriarPombo,
  usePombo,
  usePombos,
  useProprietarios,
} from '../../api/hooks'
import type { PomboInput, Sexo, StatusPombo } from '../../api/types'
import { PomboSelect } from '../../components/PomboSelect'

const VAZIO: PomboInput = {
  anilha: '',
  sexo: 'DESCONHECIDO',
  cor: '',
  status: 'ATIVO',
  observacoes: '',
  origem: '',
  proprietario_id: undefined,
  pai_id: undefined,
  mae_id: undefined,
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

const inputClass = 'w-full rounded border border-slate-300 px-2 py-1 text-sm'

export function PomboForm() {
  const params = useParams()
  const editandoId = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()

  const { data: pomboAtual } = usePombo(editandoId)
  const { data: todosPombos } = usePombos({})
  const { data: proprietarios } = useProprietarios()

  const [dados, setDados] = useState<PomboInput>(VAZIO)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (pomboAtual) {
      setDados({
        anilha: pomboAtual.anilha,
        sexo: pomboAtual.sexo,
        cor: pomboAtual.cor ?? '',
        status: pomboAtual.status,
        observacoes: pomboAtual.observacoes ?? '',
        origem: pomboAtual.origem ?? '',
        proprietario_id: pomboAtual.proprietario_id ?? undefined,
        pai_id: pomboAtual.pai_id ?? undefined,
        mae_id: pomboAtual.mae_id ?? undefined,
      })
    }
  }, [pomboAtual])

  const criar = useCriarPombo()
  const atualizar = useAtualizarPombo()

  function campo<K extends keyof PomboInput>(chave: K, valor: PomboInput[K]) {
    setDados((d) => ({ ...d, [chave]: valor }))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const payload: PomboInput = {
      ...dados,
      cor: dados.cor || null,
      observacoes: dados.observacoes || null,
      origem: dados.origem || null,
    }
    try {
      if (editandoId) {
        const resultado = await atualizar.mutateAsync({ id: editandoId, dados: payload })
        navigate(`/pombos/${resultado.id}`)
      } else {
        const resultado = await criar.mutateAsync(payload)
        navigate(`/pombos/${resultado.id}`)
      }
    } catch (err: any) {
      setErro(err?.response?.data?.detail ?? 'Erro ao salvar o pombo.')
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-slate-800">
        {editandoId ? `Editar pombo ${pomboAtual?.anilha ?? ''}` : 'Novo pombo'}
      </h1>

      <form onSubmit={salvar} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {erro && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Anilha *">
            <input
              required
              className={inputClass}
              value={dados.anilha}
              onChange={(e) => campo('anilha', e.target.value)}
            />
          </Campo>
          <Campo label="Sexo">
            <select
              className={inputClass}
              value={dados.sexo}
              onChange={(e) => campo('sexo', e.target.value as Sexo)}
            >
              <option value="DESCONHECIDO">Desconhecido</option>
              <option value="M">Macho</option>
              <option value="F">Fêmea</option>
            </select>
          </Campo>
          <Campo label="Cor / característica">
            <input className={inputClass} value={dados.cor ?? ''} onChange={(e) => campo('cor', e.target.value)} />
          </Campo>
          <Campo label="Status">
            <select
              className={inputClass}
              value={dados.status}
              onChange={(e) => campo('status', e.target.value as StatusPombo)}
            >
              <option value="ATIVO">Ativo</option>
              <option value="REPRODUTOR">Reprodutor</option>
              <option value="VENDIDO">Vendido</option>
              <option value="FALECIDO">Falecido</option>
            </select>
          </Campo>
          <Campo label="Proprietário">
            <select
              className={inputClass}
              value={dados.proprietario_id ?? ''}
              onChange={(e) => campo('proprietario_id', e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Sem proprietário definido</option>
              {proprietarios?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Pai">
            <PomboSelect
              pombos={todosPombos ?? []}
              value={dados.pai_id}
              onChange={(id) => campo('pai_id', id)}
              excludeId={editandoId}
              label="pai"
              sexoPadrao="M"
            />
          </Campo>
          <Campo label="Mãe">
            <PomboSelect
              pombos={todosPombos ?? []}
              value={dados.mae_id}
              onChange={(id) => campo('mae_id', id)}
              excludeId={editandoId}
              label="mãe"
              sexoPadrao="F"
            />
          </Campo>
        </div>

        <Campo label="Origem (se pai/mãe não estiverem cadastrados no sistema)">
          <input
            placeholder='ex: "Comprado de terceiros", "J. Fora"'
            className={inputClass}
            value={dados.origem ?? ''}
            onChange={(e) => campo('origem', e.target.value)}
          />
        </Campo>

        <Campo label="Observações">
          <textarea
            className={inputClass}
            rows={3}
            value={dados.observacoes ?? ''}
            onChange={(e) => campo('observacoes', e.target.value)}
          />
        </Campo>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={criar.isPending || atualizar.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
