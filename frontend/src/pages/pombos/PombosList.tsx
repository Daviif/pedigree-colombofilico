import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useCompartilhamentos, usePombos, useProprietarios, useUsuarioAtual } from '../../api/hooks'
import type { Pombo, PombosFiltro, Sexo, StatusPombo } from '../../api/types'
import { FalhaAoCarregar } from '../../components/FalhaAoCarregar'
import { ordemAnilha } from '../../formatadores'
import { Aviso, Botao, Campo, Carregando, Migalhas, SeloSituacao, SexoRotulo, Vazio, classeBotao, classeEntrada } from '../../components/ui'

/** LI-03: compara anilhas como números (2/24 antes de 10/24). */

function LinkPombo({ pombo, neutro }: { pombo?: { id: number; anilha: string } | null; neutro?: boolean }) {
  if (!pombo) return <span className="text-slate-400">—</span>
  return (
    <Link
      to={`/pombos/${pombo.id}`}
      onClick={(e) => e.stopPropagation()}
      className={`tabular-nums hover:underline ${neutro ? 'text-slate-600 hover:text-link' : 'font-semibold text-link'}`}
    >
      {pombo.anilha}
    </Link>
  )
}

/** Lista de pombos (LI-01..06). */
export function PombosList() {
  const { data: usuario } = useUsuarioAtual()
  const { data: compartilhamentos } = useCompartilhamentos()
  // ?plantel=<id do dono> ou ?plantel=todos; sem nada, o plantel do próprio usuário.
  const [searchParams, setSearchParams] = useSearchParams()
  const plantel = searchParams.get('plantel') ?? String(usuario!.id)
  const meuPlantel = plantel === String(usuario!.id)
  const soIncompletos = searchParams.get('incompleto') === '1'
  const outrosPlanteis = compartilhamentos?.recebidos ?? []
  const escolhePlantel = usuario!.admin || outrosPlanteis.length > 0

  const [filtro, setFiltro] = useState<PombosFiltro>({})
  const [crescente, setCrescente] = useState(true)
  const { data: pombos, isLoading, isError, error, refetch } = usePombos({
    ...filtro,
    // proprietários são do próprio plantel: o filtro só vale nele
    proprietario_id: meuPlantel ? filtro.proprietario_id : undefined,
    usuario_id: plantel === 'todos' ? undefined : Number(plantel),
  })
  const { data: proprietarios } = useProprietarios()

  const lista = useMemo(() => {
    const base: Pombo[] = (pombos ?? []).filter((p) => !soIncompletos || !p.pai_id || !p.mae_id)
    return [...base].sort((a, b) => (crescente ? 1 : -1) * ordemAnilha.compare(a.anilha, b.anilha))
  }, [pombos, soIncompletos, crescente])

  const temFiltro = Object.values(filtro).some(Boolean) || soIncompletos

  function atualizarFiltro<K extends keyof PombosFiltro>(campo: K, valor: string) {
    setFiltro((f) => ({ ...f, [campo]: valor || undefined }))
  }

  function limparFiltros() {
    setFiltro({})
    const p = new URLSearchParams(searchParams)
    p.delete('incompleto')
    setSearchParams(p)
  }

  function tirarIncompleto() {
    const p = new URLSearchParams(searchParams)
    p.delete('incompleto')
    setSearchParams(p)
  }

  const nomePlantel = meuPlantel
    ? 'no seu plantel'
    : plantel === 'todos'
      ? 'em todos os plantéis que você vê'
      : `no plantel de ${outrosPlanteis.find((u) => String(u.id) === plantel)?.nome ?? 'outro criador'} (só leitura)`

  return (
    <div className="space-y-4">
      <div>
        <Migalhas itens={[{ rotulo: 'Início', para: '/' }, { rotulo: 'Meus pombos' }]} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold text-marinho">Meus pombos</h1>
            <p className="text-sm text-slate-600" aria-live="polite">
              {isLoading ? 'Carregando…' : `${lista.length} ${lista.length === 1 ? 'pombo' : 'pombos'} ${nomePlantel}`}
            </p>
          </div>
          <Link to="/pombos/novo" className={classeBotao('primaria')}>
            <span aria-hidden>+</span> Novo pombo
          </Link>
        </div>
      </div>

      <section aria-label="Filtros" className="rounded-[10px] border border-borda-suave bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {escolhePlantel && (
            <Campo rotulo="Plantel" className="col-span-2 md:col-span-3 xl:col-span-1">
              {(c) => (
                <select
                  {...c}
                  value={plantel}
                  className={classeEntrada()}
                  onChange={(e) => {
                    setFiltro((f) => ({ ...f, proprietario_id: undefined }))
                    setSearchParams(e.target.value === String(usuario!.id) ? {} : { plantel: e.target.value })
                  }}
                >
                  <option value={usuario!.id}>Meu plantel</option>
                  {outrosPlanteis.map((u) => (
                    <option key={u.id} value={u.id}>
                      Plantel de {u.nome} ({u.login})
                    </option>
                  ))}
                  <option value="todos">{usuario!.admin ? 'Todos os plantéis' : 'Todos os que vejo'}</option>
                </select>
              )}
            </Campo>
          )}
          <Campo rotulo="Anilha">
            {(c) => <input {...c} inputMode="numeric" placeholder="contém…" value={filtro.anilha ?? ''} className={classeEntrada()} onChange={(e) => atualizarFiltro('anilha', e.target.value)} />}
          </Campo>
          <Campo rotulo="Cor">
            {(c) => <input {...c} placeholder="contém…" value={filtro.cor ?? ''} className={classeEntrada()} onChange={(e) => atualizarFiltro('cor', e.target.value)} />}
          </Campo>
          <Campo rotulo="Sexo">
            {(c) => (
              <select {...c} value={filtro.sexo ?? ''} className={classeEntrada()} onChange={(e) => atualizarFiltro('sexo', e.target.value as Sexo)}>
                <option value="">Todos</option>
                <option value="M">♂ Macho</option>
                <option value="F">♀ Fêmea</option>
                <option value="DESCONHECIDO">Desconhecido</option>
              </select>
            )}
          </Campo>
          <Campo rotulo="Situação">
            {(c) => (
              <select {...c} value={filtro.status ?? ''} className={classeEntrada()} onChange={(e) => atualizarFiltro('status', e.target.value as StatusPombo)}>
                <option value="">Todas</option>
                <option value="ATIVO">Ativo</option>
                <option value="REPRODUTOR">Reprodutor</option>
                <option value="VENDIDO">Vendido</option>
                <option value="FALECIDO">Falecido</option>
              </select>
            )}
          </Campo>
          {meuPlantel && (
            <Campo rotulo="Proprietário" className="col-span-2 md:col-span-1">
              {(c) => (
                <select {...c} value={filtro.proprietario_id ?? ''} className={classeEntrada()} onChange={(e) => atualizarFiltro('proprietario_id', e.target.value)}>
                  <option value="">Todos</option>
                  {proprietarios?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
          )}
        </div>
        {temFiltro && (
          <Botao variante="fantasma" pequeno className="mt-2" onClick={limparFiltros}>
            Limpar filtros
          </Botao>
        )}
      </section>

      {soIncompletos && (
        <Aviso tom="alerta">
          Mostrando só pombos <b>sem pai ou sem mãe</b> cadastrados.{' '}
          <button type="button" onClick={tirarIncompleto} className="min-h-11 font-semibold underline sm:min-h-0">
            Ver todos
          </button>
        </Aviso>
      )}

      {isError ? (
        <FalhaAoCarregar erro={error} oQue="os pombos" onTentar={refetch} />
      ) : isLoading ? (
        <div className="rounded-[10px] border border-borda-suave bg-white px-5 shadow-sm">
          <Carregando linhas={6} rotulo="Carregando os pombos…" />
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-[10px] border border-borda-suave bg-white shadow-sm">
          {temFiltro ? (
            <Vazio titulo="Nenhum pombo com esses filtros" acao={<Botao onClick={limparFiltros}>Limpar filtros</Botao>}>
              Tente outra anilha ou outra cor.
            </Vazio>
          ) : (
            <Vazio
              titulo={meuPlantel ? 'Nenhum pombo cadastrado ainda' : 'Este plantel ainda não tem pombos'}
              acao={meuPlantel && <Link to="/pombos/novo" className={classeBotao('primaria')}>+ Cadastrar o primeiro</Link>}
            >
              {meuPlantel && 'Comece pelo primeiro. Pai e mãe podem ser ligados depois, direto na árvore.'}
            </Vazio>
          )}
        </div>
      ) : (
        <>
          {/* Celular: cartões */}
          <ul className="divide-y divide-borda-suave overflow-hidden rounded-[10px] border border-borda-suave bg-white shadow-sm sm:hidden">
            {lista.map((p) => (
              <li key={p.id} className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <Link to={`/pombos/${p.id}`} className="inline-flex min-h-11 items-center break-all text-[15px] font-semibold text-link tabular-nums">
                    {p.anilha}
                  </Link>
                  <SeloSituacao situacao={p.status} />
                </div>
                <div className="text-sm text-slate-700">
                  <SexoRotulo sexo={p.sexo} /> · {p.cor || 'cor não informada'}
                  {p.proprietario && <span className="text-slate-500"> · {p.proprietario.nome}</span>}
                </div>
                {!meuPlantel && <div className="text-xs text-amber-800">Plantel de {p.dono.nome}</div>}
                <div className="mt-0.5 text-[13px] text-slate-500">
                  Pai <LinkPombo pombo={p.pai} neutro /> · Mãe <LinkPombo pombo={p.mae} neutro />
                </div>
              </li>
            ))}
          </ul>

          {/* Telas maiores: tabela */}
          <div className="hidden overflow-x-auto rounded-[10px] border border-borda-suave bg-white shadow-sm sm:block">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafd] text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th scope="col" aria-sort={crescente ? 'ascending' : 'descending'} className="px-4 py-3">
                    <button type="button" onClick={() => setCrescente((c) => !c)} className="inline-flex items-center gap-1 font-semibold hover:text-marinho">
                      Anilha <span aria-hidden>{crescente ? '▲' : '▼'}</span>
                      <span className="sr-only">(clique para inverter a ordem)</span>
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3">Sexo</th>
                  <th scope="col" className="px-4 py-3">Cor</th>
                  <th scope="col" className="px-4 py-3">Situação</th>
                  <th scope="col" className="px-4 py-3">Proprietário</th>
                  <th scope="col" className="px-4 py-3">Pai / Mãe</th>
                  {!meuPlantel && <th scope="col" className="px-4 py-3">Plantel</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-borda-suave">
                {lista.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f8fafd]">
                    <td className="px-4 py-3">
                      <LinkPombo pombo={p} />
                    </td>
                    <td className="px-4 py-3"><SexoRotulo sexo={p.sexo} /></td>
                    <td className="px-4 py-3">{p.cor || '—'}</td>
                    <td className="px-4 py-3"><SeloSituacao situacao={p.status} /></td>
                    <td className="px-4 py-3">{p.proprietario?.nome ?? '—'}</td>
                    <td className="px-4 py-3">
                      <LinkPombo pombo={p.pai} neutro /> <span className="text-slate-400">/</span> <LinkPombo pombo={p.mae} neutro />
                    </td>
                    {!meuPlantel && <td className="px-4 py-3 text-slate-600">{p.dono.nome}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
