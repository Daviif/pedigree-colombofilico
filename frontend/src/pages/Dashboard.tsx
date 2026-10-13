import { Link } from 'react-router-dom'

import { usePombos, useProprietarios } from '../api/hooks'

function Cartao({ titulo, valor, to }: { titulo: string; valor: number | string; to: string }) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition sm:p-5 hover:border-blue-300 hover:shadow"
    >
      <div className="text-sm text-slate-500">{titulo}</div>
      <div className="mt-1 text-2xl font-semibold sm:text-3xl text-slate-800">{valor}</div>
    </Link>
  )
}

export function Dashboard() {
  const { data: pombos } = usePombos({})
  const { data: proprietarios } = useProprietarios()

  const reprodutores = pombos?.filter((p) => p.status === 'REPRODUTOR') ?? []
  const ultimos = [...(pombos ?? [])].sort((a, b) => b.id - a.id).slice(0, 5)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Painel</h1>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Cartao titulo="Pombos cadastrados" valor={pombos?.length ?? '—'} to="/pombos" />
        <Cartao titulo="Reprodutores ativos" valor={reprodutores.length} to="/reprodutores" />
        <Cartao titulo="Proprietários" valor={proprietarios?.length ?? '—'} to="/proprietarios" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-lg font-medium text-slate-800">Últimos cadastrados</h2>
        {ultimos.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum pombo cadastrado ainda.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {ultimos.map((pombo) => (
            <li key={pombo.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <Link to={`/pombos/${pombo.id}`} className="font-medium text-blue-700 hover:underline">
                {pombo.anilha}
              </Link>
              <span className="text-right text-slate-500">
                {pombo.cor ?? '—'} · {pombo.sexo}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
