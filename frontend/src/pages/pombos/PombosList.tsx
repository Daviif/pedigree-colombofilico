import { useState } from 'react'
import { Link } from 'react-router-dom'

import { usePombos, useProprietarios } from '../../api/hooks'
import type { PombosFiltro, Sexo, StatusPombo } from '../../api/types'

export function PombosList() {
  const [filtro, setFiltro] = useState<PombosFiltro>({})
  const { data: pombos, isLoading } = usePombos(filtro)
  const { data: proprietarios } = useProprietarios()

  function atualizarFiltro(campo: keyof PombosFiltro, valor: string) {
    setFiltro((f) => ({ ...f, [campo]: valor || undefined }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">Pombos</h1>
        <Link
          to="/pombos/novo"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Novo pombo
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-5 sm:gap-3 sm:p-4">
        <input
          placeholder="Anilha"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
          onChange={(e) => atualizarFiltro('anilha', e.target.value)}
        />
        <input
          placeholder="Cor"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
          onChange={(e) => atualizarFiltro('cor', e.target.value)}
        />
        <select
          className="rounded border border-slate-300 px-2 py-1 text-sm"
          onChange={(e) => atualizarFiltro('sexo', e.target.value as Sexo)}
        >
          <option value="">Sexo (todos)</option>
          <option value="M">Macho</option>
          <option value="F">Fêmea</option>
          <option value="DESCONHECIDO">Desconhecido</option>
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-1 text-sm"
          onChange={(e) => atualizarFiltro('status', e.target.value as StatusPombo)}
        >
          <option value="">Status (todos)</option>
          <option value="ATIVO">Ativo</option>
          <option value="REPRODUTOR">Reprodutor</option>
          <option value="VENDIDO">Vendido</option>
          <option value="FALECIDO">Falecido</option>
        </select>
        <select
          className="col-span-2 rounded border border-slate-300 px-2 py-1 text-sm sm:col-span-1"
          onChange={(e) => atualizarFiltro('proprietario_id', e.target.value)}
        >
          <option value="">Proprietário (todos)</option>
          {proprietarios?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Celular: lista de cartões */}
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm sm:hidden">
        {isLoading && <li className="px-4 py-4 text-sm text-slate-500">Carregando...</li>}
        {!isLoading && pombos?.length === 0 && (
          <li className="px-4 py-4 text-sm text-slate-500">Nenhum pombo encontrado.</li>
        )}
        {pombos?.map((pombo) => (
          <li key={pombo.id}>
            <Link to={`/pombos/${pombo.id}`} className="block px-4 py-3 text-sm active:bg-slate-50">
              <div className="flex items-baseline justify-between gap-3">
                <span className="break-all font-medium text-blue-700">{pombo.anilha}</span>
                <span className="shrink-0 text-xs text-slate-500">{pombo.status}</span>
              </div>
              <div className="text-slate-600">
                {pombo.sexo} · {pombo.cor ?? '—'}
                {pombo.proprietario ? ` · ${pombo.proprietario.nome}` : ''}
              </div>
              <div className="text-xs text-slate-400">
                Pai: {pombo.pai?.anilha ?? '—'} · Mãe: {pombo.mae?.anilha ?? '—'}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Telas maiores: tabela */}
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Anilha</th>
              <th className="px-4 py-2">Sexo</th>
              <th className="px-4 py-2">Cor</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Proprietário</th>
              <th className="px-4 py-2">Pai / Mãe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={6}>
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && pombos?.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={6}>
                  Nenhum pombo encontrado.
                </td>
              </tr>
            )}
            {pombos?.map((pombo) => (
              <tr key={pombo.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/pombos/${pombo.id}`} className="font-medium text-blue-700 hover:underline">
                    {pombo.anilha}
                  </Link>
                </td>
                <td className="px-4 py-2">{pombo.sexo}</td>
                <td className="px-4 py-2">{pombo.cor ?? '—'}</td>
                <td className="px-4 py-2">{pombo.status}</td>
                <td className="px-4 py-2">{pombo.proprietario?.nome ?? '—'}</td>
                <td className="px-4 py-2 text-slate-500">
                  {pombo.pai?.anilha ?? '—'} / {pombo.mae?.anilha ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
