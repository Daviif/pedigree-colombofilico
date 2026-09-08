import { Link } from 'react-router-dom'

import { usePombos } from '../api/hooks'

export function Reprodutores() {
  const { data: pombos, isLoading } = usePombos({ status: 'REPRODUTOR' })

  const machos = pombos?.filter((p) => p.sexo === 'M') ?? []
  const femeas = pombos?.filter((p) => p.sexo === 'F') ?? []
  const outros = pombos?.filter((p) => p.sexo === 'DESCONHECIDO') ?? []

  function Grupo({ titulo, lista }: { titulo: string; lista: typeof machos }) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-slate-800">
          {titulo} ({lista.length})
        </h2>
        {lista.length === 0 && <p className="text-sm text-slate-500">Nenhum reprodutor nesta categoria.</p>}
        <ul className="divide-y divide-slate-100">
          {lista.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
              <Link to={`/pombos/${p.id}`} className="font-medium text-blue-700 hover:underline">
                {p.anilha}
              </Link>
              <span className="text-slate-500">
                {p.cor ?? '—'} {p.proprietario ? `· ${p.proprietario.nome}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Reprodutores</h1>
      {isLoading && <p className="text-slate-500">Carregando...</p>}
      <div className="grid gap-6 sm:grid-cols-2">
        <Grupo titulo="Machos" lista={machos} />
        <Grupo titulo="Fêmeas" lista={femeas} />
      </div>
      {outros.length > 0 && <Grupo titulo="Sexo não informado" lista={outros} />}
    </div>
  )
}
