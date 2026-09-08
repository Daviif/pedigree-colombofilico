import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useArvore, usePombo, useRemoverPombo } from '../../api/hooks'
import { IrmaosSection } from '../../components/IrmaosSection'
import { PedigreeTree } from '../../components/PedigreeTree'
import { ProprietarioHeader } from '../../components/ProprietarioHeader'
import { ResultadosSection } from '../../components/ResultadosSection'

export function PomboDetail() {
  const { id } = useParams()
  const pomboId = Number(id)
  const navigate = useNavigate()

  const [geracoes, setGeracoes] = useState(4)
  const { data: pombo, isLoading } = usePombo(pomboId)
  const { data: arvore } = useArvore(pomboId, geracoes)
  const remover = useRemoverPombo()

  if (isLoading || !pombo) {
    return <p className="text-slate-500">Carregando...</p>
  }

  async function excluir() {
    if (!confirm(`Remover o pombo ${pombo!.anilha}? Essa ação não pode ser desfeita.`)) return
    await remover.mutateAsync(pomboId)
    navigate('/pombos')
  }

  return (
    <div className="space-y-6">
      {pombo.proprietario && <ProprietarioHeader proprietario={pombo.proprietario} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{pombo.anilha}</h1>
          <p className="text-sm text-slate-500">
            {pombo.sexo} · {pombo.cor ?? '—'} · {pombo.status}
          </p>
          {pombo.observacoes && (
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{pombo.observacoes}</p>
          )}
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/pombos/${pomboId}/${
              import.meta.env.VITE_DESKTOP ? 'certificado-html' : 'certificado'
            }?geracoes=${geracoes}`}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Gerar certificado PDF
          </a>
          <Link
            to={`/pombos/${pomboId}/editar`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Editar
          </Link>
          <button
            onClick={excluir}
            className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Excluir
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-800">Árvore genealógica</h2>
          <label className="text-sm text-slate-600">
            Gerações:{' '}
            <select
              value={geracoes}
              onChange={(e) => setGeracoes(Number(e.target.value))}
              className="rounded border border-slate-300 px-2 py-1"
            >
              {[2, 3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        </div>
        {arvore ? <PedigreeTree raiz={arvore} /> : <p className="text-sm text-slate-500">Carregando árvore...</p>}
      </div>

      <IrmaosSection pomboId={pomboId} />

      <ResultadosSection pomboId={pomboId} />
    </div>
  )
}
