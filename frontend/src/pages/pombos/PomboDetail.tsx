import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  eNaoEncontrado,
  mensagemDeErro,
  useArvore,
  useCopiarPombo,
  usePombo,
  useRemoverPombo,
  useUsuarioAtual,
} from '../../api/hooks'
import { IrmaosSection } from '../../components/IrmaosSection'
import { PedigreeTree } from '../../components/PedigreeTree'
import { ProprietarioHeader } from '../../components/ProprietarioHeader'
import { ResultadosSection } from '../../components/ResultadosSection'
import { FalhaAoCarregar } from '../../components/FalhaAoCarregar'
import { Migalhas } from '../../components/ui'

export function PomboDetail() {
  const { id } = useParams()
  const pomboId = Number(id)
  const navigate = useNavigate()

  const [geracoes, setGeracoes] = useState(4)
  const { data: pombo, isError, error, refetch } = usePombo(pomboId)
  const arvoreQuery = useArvore(pomboId, geracoes)
  const arvore = arvoreQuery.data
  const remover = useRemoverPombo()
  const copiar = useCopiarPombo()
  const { data: usuario } = useUsuarioAtual()

  if (isError && eNaoEncontrado(error)) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-800">Pombo não encontrado</h1>
        <p className="text-sm text-slate-500">Ele pode ter sido excluído, ou não está num plantel que você pode ver.</p>
        <Link to="/pombos" className="text-sm font-medium text-blue-700 hover:underline">
          Voltar para a lista de pombos
        </Link>
      </div>
    )
  }
  if (isError) return <FalhaAoCarregar erro={error} oQue="o pombo" onTentar={refetch} />
  if (!pombo) {
    return <p className="text-slate-500">Carregando...</p>
  }

  async function excluir() {
    if (!confirm(`Remover o pombo ${pombo!.anilha}? Essa ação não pode ser desfeita.`)) return
    try {
      await remover.mutateAsync(pomboId)
      navigate('/pombos')
    } catch (err) {
      // RG-09: pombo com filhos não pode ser excluído; o servidor lista os filhos.
      alert(mensagemDeErro(err, 'Erro ao excluir o pombo.'))
    }
  }

  const doMeuPlantel = pombo.usuario_id === usuario!.id
  const podeEditar = doMeuPlantel || usuario!.admin

  async function copiarParaMeuPlantel() {
    if (!confirm(`Copiar o pombo ${pombo!.anilha}, com os ancestrais e resultados, para o seu plantel?`)) return
    try {
      const copia = await copiar.mutateAsync(pomboId)
      navigate(`/pombos/${copia.id}`)
    } catch (err) {
      alert(mensagemDeErro(err, 'Erro ao copiar o pombo.'))
    }
  }

  return (
    <div className="space-y-6">
      {!doMeuPlantel && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Plantel de <strong>{pombo.dono.nome}</strong>
          {podeEditar ? '.' : ': você pode ver este pombo, mas não alterá-lo.'}
        </div>
      )}

      {pombo.proprietario && <ProprietarioHeader proprietario={pombo.proprietario} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Migalhas itens={[{ rotulo: 'Início', para: '/' }, { rotulo: 'Meus pombos', para: '/pombos' }, { rotulo: pombo.anilha }]} />
          <h1 className="break-all text-2xl font-semibold text-marinho">{pombo.anilha}</h1>
          <p className="text-sm text-slate-500">
            {pombo.sexo} · {pombo.cor ?? '—'} · {pombo.status}
          </p>
          {pombo.observacoes && (
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{pombo.observacoes}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/pombos/${pomboId}/certificado?geracoes=${geracoes}`}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Gerar certificado PDF
          </a>
          {!doMeuPlantel && (
            <button
              onClick={copiarParaMeuPlantel}
              disabled={copiar.isPending}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Copiar para meu plantel
            </button>
          )}
          {podeEditar && (
            <>
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
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
        {arvoreQuery.isError ? (
          <FalhaAoCarregar erro={arvoreQuery.error} oQue="a árvore" onTentar={arvoreQuery.refetch} />
        ) : arvore ? (
          <PedigreeTree raiz={arvore} />
        ) : (
          <p className="text-sm text-slate-500">Carregando árvore...</p>
        )}
      </div>

      <IrmaosSection pomboId={pomboId} />

      <ResultadosSection pomboId={pomboId} somenteLeitura={!podeEditar} />
    </div>
  )
}
