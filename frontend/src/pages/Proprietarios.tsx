import { useState } from 'react'

import {
  useAtualizarProprietario,
  useCriarProprietario,
  useProprietarios,
  useRemoverProprietario,
} from '../api/hooks'
import type { ProprietarioInput } from '../api/types'

const VAZIO: ProprietarioInput = {
  nome: '',
  colombodromo: '',
  endereco: '',
  telefone: '',
  email: '',
  observacoes: '',
}

export function Proprietarios() {
  const { data: proprietarios } = useProprietarios()
  const criar = useCriarProprietario()
  const atualizar = useAtualizarProprietario()
  const remover = useRemoverProprietario()

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [dados, setDados] = useState<ProprietarioInput>(VAZIO)
  const [mostrarForm, setMostrarForm] = useState(false)

  function editar(id: number, atual: ProprietarioInput) {
    setEditandoId(id)
    setDados(atual)
    setMostrarForm(true)
  }

  function novo() {
    setEditandoId(null)
    setDados(VAZIO)
    setMostrarForm(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const payload: ProprietarioInput = {
      ...dados,
      colombodromo: dados.colombodromo || null,
      endereco: dados.endereco || null,
      telefone: dados.telefone || null,
      email: dados.email || null,
      observacoes: dados.observacoes || null,
    }
    if (editandoId) {
      await atualizar.mutateAsync({ id: editandoId, dados: payload })
    } else {
      await criar.mutateAsync(payload)
    }
    setMostrarForm(false)
  }

  async function excluir(id: number, nome: string) {
    if (!confirm(`Remover o proprietário "${nome}"?`)) return
    await remover.mutateAsync(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">Proprietários</h1>
        <button
          onClick={novo}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Novo proprietário
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={salvar}
          className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5"
        >
          <input
            required
            placeholder="Nome *"
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            value={dados.nome}
            onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))}
          />
          <input
            placeholder="Colombófilo / pombal"
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            value={dados.colombodromo ?? ''}
            onChange={(e) => setDados((d) => ({ ...d, colombodromo: e.target.value }))}
          />
          <input
            placeholder="Endereço"
            className="rounded border border-slate-300 px-2 py-1 text-sm sm:col-span-2"
            value={dados.endereco ?? ''}
            onChange={(e) => setDados((d) => ({ ...d, endereco: e.target.value }))}
          />
          <input
            placeholder="Telefone"
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            value={dados.telefone ?? ''}
            onChange={(e) => setDados((d) => ({ ...d, telefone: e.target.value }))}
          />
          <input
            placeholder="E-mail"
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            value={dados.email ?? ''}
            onChange={(e) => setDados((d) => ({ ...d, email: e.target.value }))}
          />
          <textarea
            placeholder="Títulos / observações do pombal (aparecem no cabeçalho do certificado)"
            className="rounded border border-slate-300 px-2 py-1 text-sm sm:col-span-2"
            rows={2}
            value={dados.observacoes ?? ''}
            onChange={(e) => setDados((d) => ({ ...d, observacoes: e.target.value }))}
          />
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Celular: lista de cartões */}
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm sm:hidden">
        {proprietarios?.map((p) => (
          <li key={p.id} className="px-4 py-3 text-sm">
            <div className="font-medium">{p.nome}</div>
            {p.colombodromo && <div className="text-slate-600">Pombal {p.colombodromo}</div>}
            {(p.telefone || p.email) && (
              <div className="break-all text-slate-500">{[p.telefone, p.email].filter(Boolean).join(' · ')}</div>
            )}
            <div className="mt-2 flex gap-4">
              <button onClick={() => editar(p.id, p)} className="py-1 text-blue-700 hover:underline">
                editar
              </button>
              <button onClick={() => excluir(p.id, p.nome)} className="py-1 text-red-600 hover:underline">
                remover
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Telas maiores: tabela */}
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Pombal</th>
              <th className="px-4 py-2">Telefone</th>
              <th className="px-4 py-2">E-mail</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proprietarios?.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium">{p.nome}</td>
                <td className="px-4 py-2">{p.colombodromo ?? '—'}</td>
                <td className="px-4 py-2">{p.telefone ?? '—'}</td>
                <td className="px-4 py-2">{p.email ?? '—'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => editar(p.id, p)} className="mr-3 text-blue-700 hover:underline">
                    editar
                  </button>
                  <button onClick={() => excluir(p.id, p.nome)} className="text-red-600 hover:underline">
                    remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
