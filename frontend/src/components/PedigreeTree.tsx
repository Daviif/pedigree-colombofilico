import { Link } from 'react-router-dom'

import type { ArvoreNo } from '../api/types'

function No({ no }: { no: ArvoreNo | null | undefined }) {
  if (!no) {
    return (
      <div className="m-1 min-w-[150px] rounded border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400">
        Desconhecido
      </div>
    )
  }

  const temFilhos = Boolean(no.pai || no.mae)

  return (
    <div className="flex items-center">
      <div
        className={`m-1 min-w-[150px] rounded border px-3 py-2 text-xs ${
          no.duplicado ? 'border-amber-500 bg-amber-50' : 'border-slate-300 bg-white'
        }`}
      >
        {no.grau_parentesco && (
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {no.grau_parentesco}
          </div>
        )}
        {no.id ? (
          <Link to={`/pombos/${no.id}`} className="font-semibold text-blue-700 hover:underline">
            {no.anilha}
          </Link>
        ) : (
          <span className="font-semibold">{no.anilha}</span>
        )}
        <div className="text-slate-500">
          {no.sexo ?? ''} {no.cor ? `— ${no.cor}` : ''}
        </div>
        {no.proprietario_nome && <div className="text-slate-400">Dono: {no.proprietario_nome}</div>}
        {no.origem && !no.id && <div className="text-slate-400">Origem: {no.origem}</div>}
        {no.duplicado && <div className="font-medium text-amber-700">⚠ ancestral repetido</div>}
        {no.resultados.length > 0 && (
          <div className="mt-1 border-t border-dashed border-slate-200 pt-1 text-slate-600">
            {no.resultados.map((r, i) => (
              <div key={i}>
                {r.ano ? `${r.ano} — ` : ''}
                {r.competicao}
                {r.colocacao ? ` (${r.colocacao})` : ''}
              </div>
            ))}
          </div>
        )}
      </div>

      {temFilhos && (
        <>
          <div className="h-0.5 w-4 shrink-0 bg-slate-300" />
          <div className="flex flex-col justify-around border-l-2 border-slate-300">
            <div className="flex items-center py-1">
              <div className="h-0.5 w-3 shrink-0 bg-slate-300" />
              <No no={no.pai} />
            </div>
            <div className="flex items-center py-1">
              <div className="h-0.5 w-3 shrink-0 bg-slate-300" />
              <No no={no.mae} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function PedigreeTree({ raiz }: { raiz: ArvoreNo }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex w-max items-center py-2">
        <No no={raiz} />
      </div>
    </div>
  )
}
