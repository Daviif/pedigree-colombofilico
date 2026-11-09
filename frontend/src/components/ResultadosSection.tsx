import { useRef, useState } from 'react'

import { separarErros } from '../api/erros'
import { useCriarResultado, useRemoverResultado, useResultados } from '../api/hooks'
import type { ResultadoInput } from '../api/types'
import { FalhaAoCarregar } from './FalhaAoCarregar'
import { Aviso, Botao, Campo, Carregando, DialogoConfirmacao, classeEntrada, useNotificar } from './ui'

const CAMPOS = ['ano', 'competicao', 'distancia_km', 'colocacao', 'premio'] as const
const VAZIO = { ano: '', competicao: '', distancia_km: '', colocacao: '', premio: '' }

/** Resultados do pombo (DT-06): ano, prova, km, colocação e prêmio; do mais recente ao mais antigo. */
export function ResultadosSection({ pomboId, somenteLeitura = false }: { pomboId: number; somenteLeitura?: boolean }) {
  const { data: resultados, isLoading, isError, error, refetch } = useResultados(pomboId)
  const criar = useCriarResultado(pomboId)
  const remover = useRemoverResultado(pomboId)
  const notificar = useNotificar()
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState(VAZIO)
  const [erros, setErros] = useState<Partial<Record<(typeof CAMPOS)[number], string>>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState<{ id: number; nome: string } | null>(null)
  const ano = useRef<HTMLInputElement>(null)

  function campo(chave: keyof typeof VAZIO, valor: string) {
    setForm((f) => ({ ...f, [chave]: valor }))
    setErros((e) => ({ ...e, [chave]: undefined }))
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    setErroGeral(null)
    if (!form.competicao.trim()) {
      setErros({ competicao: 'Prova: obrigatória' })
      return
    }
    const dados: ResultadoInput = {
      ano: form.ano ? Number(form.ano) : null,
      competicao: form.competicao,
      distancia_km: form.distancia_km ? Number(form.distancia_km) : null,
      colocacao: form.colocacao || null,
      premio: form.premio || null,
      observacao: null,
    }
    try {
      await criar.mutateAsync(dados)
      notificar('Resultado adicionado')
      setForm(VAZIO)
      setErros({})
      ano.current?.focus()
    } catch (err) {
      const r = separarErros(err, CAMPOS, 'Não foi possível adicionar o resultado.')
      setErros(r.campos)
      setErroGeral(r.geral)
    }
  }

  const ordenados = [...(resultados ?? [])].sort((a, b) => (b.ano ?? -1) - (a.ano ?? -1) || b.id - a.id)

  return (
    <section aria-labelledby="titulo-resultados" className="rounded-[10px] border border-borda-suave bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-resultados" className="text-[17px] font-semibold text-marinho">
          Resultados
        </h2>
        {!somenteLeitura && !aberto && (
          <Botao pequeno onClick={() => setAberto(true)}>
            + Resultado
          </Botao>
        )}
      </div>

      {aberto && (
        <form onSubmit={adicionar} noValidate className="mb-4 rounded-[10px] border border-borda-suave bg-[#f8fafd] p-3.5">
          {erroGeral && (
            <Aviso tom="erro" className="mb-3">
              {erroGeral}
            </Aviso>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-[6rem_1fr_6rem_8rem_1fr]">
            <Campo rotulo="Ano" erro={erros.ano}>
              {(c) => <input {...c} ref={ano} autoFocus inputMode="numeric" placeholder="2025" value={form.ano} onChange={(e) => campo('ano', e.target.value.replace(/\D/g, '').slice(0, 4))} className={`${classeEntrada(!!erros.ano)} tabular-nums`} />}
            </Campo>
            <Campo rotulo="Prova" obrigatorio erro={erros.competicao} className="col-span-2 md:col-span-1">
              {(c) => <input {...c} placeholder="ex.: Prova Navarro" value={form.competicao} onChange={(e) => campo('competicao', e.target.value)} className={classeEntrada(!!erros.competicao)} />}
            </Campo>
            <Campo rotulo="Km" erro={erros.distancia_km}>
              {(c) => <input {...c} inputMode="numeric" value={form.distancia_km} onChange={(e) => campo('distancia_km', e.target.value.replace(/\D/g, '').slice(0, 5))} className={`${classeEntrada(!!erros.distancia_km)} tabular-nums`} />}
            </Campo>
            <Campo rotulo="Colocação" erro={erros.colocacao}>
              {(c) => <input {...c} placeholder="ex.: 1º" value={form.colocacao} onChange={(e) => campo('colocacao', e.target.value)} className={classeEntrada(!!erros.colocacao)} />}
            </Campo>
            <Campo rotulo="Prêmio" erro={erros.premio} className="col-span-2 md:col-span-1">
              {(c) => <input {...c} placeholder="ex.: Troféu" value={form.premio} onChange={(e) => campo('premio', e.target.value)} className={classeEntrada(!!erros.premio)} />}
            </Campo>
          </div>
          <div className="mt-3 flex gap-2">
            <Botao type="submit" variante="escura" carregando={criar.isPending}>
              Adicionar
            </Botao>
            <Botao variante="fantasma" onClick={() => { setAberto(false); setForm(VAZIO); setErros({}); setErroGeral(null) }}>
              Fechar
            </Botao>
          </div>
        </form>
      )}

      {isLoading ? (
        <Carregando linhas={3} />
      ) : isError ? (
        <FalhaAoCarregar erro={error} oQue="os resultados" onTentar={refetch} />
      ) : ordenados.length === 0 ? (
        <p className="text-slate-600">Nenhum resultado registrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-semibold text-slate-500">
              <tr className="border-b border-borda-suave">
                <th scope="col" className="py-2 pr-3">Ano</th>
                <th scope="col" className="py-2 pr-3">Prova</th>
                <th scope="col" className="hidden py-2 pr-3 sm:table-cell">Km</th>
                <th scope="col" className="py-2 pr-3">Colocação</th>
                <th scope="col" className="hidden py-2 pr-3 md:table-cell">Prêmio</th>
                {!somenteLeitura && <th scope="col" className="py-2"><span className="sr-only">Ações</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-borda-suave">
              {ordenados.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 pr-3 tabular-nums">{r.ano ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    {r.competicao}
                    {r.observacao && <span className="block text-xs text-slate-500">{r.observacao}</span>}
                  </td>
                  <td className="hidden py-2.5 pr-3 tabular-nums sm:table-cell">{r.distancia_km ?? '—'}</td>
                  <td className="py-2.5 pr-3 font-semibold">{r.colocacao ?? '—'}</td>
                  <td className="hidden py-2.5 pr-3 md:table-cell">{r.premio ?? '—'}</td>
                  {!somenteLeitura && (
                    <td className="py-1 text-right">
                      <Botao variante="fantasmaPerigo" pequeno aria-label={`Remover ${r.competicao}`} onClick={() => setRemovendo({ id: r.id, nome: r.competicao })}>
                        Remover
                      </Botao>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DialogoConfirmacao
        aberto={removendo !== null}
        aoFechar={() => setRemovendo(null)}
        titulo={`Remover o resultado "${removendo?.nome ?? ''}"?`}
        textoConfirmar="Remover"
        perigo
        carregando={remover.isPending}
        aoConfirmar={async () => {
          if (!removendo) return
          await remover.mutateAsync(removendo.id)
          setRemovendo(null)
          notificar('Resultado removido')
        }}
      >
        <p>Não dá para desfazer.</p>
      </DialogoConfirmacao>
    </section>
  )
}
