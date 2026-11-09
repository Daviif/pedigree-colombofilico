import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { usePombos, useResultadosRecentes, useUsuarioAtual } from '../api/hooks'
import fotoPombo from '../assets/pombo-correio.webp'
import { BuscaGlobal } from '../components/BuscaGlobal'
import { CreditoFoto } from '../components/CreditoFoto'
import { FalhaAoCarregar } from '../components/FalhaAoCarregar'
import { Carregando, LogoPomba, SeloSituacao, SexoRotulo, classeBotao } from '../components/ui'

function saudacao(agora = new Date()) {
  const h = agora.getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function Numero({ icone, valor, rotulo, para }: { icone: ReactNode; valor: ReactNode; rotulo: string; para: string }) {
  return (
    <Link
      to={para}
      className="flex flex-col items-center rounded-xl border border-borda-suave bg-white px-1.5 py-3 text-center shadow-sm transition hover:border-dourado-2 sm:p-4"
    >
      <span aria-hidden className="text-dourado-2">
        {icone}
      </span>
      <b className="mt-1 text-xl leading-tight text-marinho tabular-nums sm:text-[26px]">{valor}</b>
      <span className="text-xs text-slate-600 sm:text-[13px]">{rotulo}</span>
    </Link>
  )
}

const iconeCoroa = (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]"><path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 12H5z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /></svg>
)
const iconeArvore = (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]"><g fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="2.5" y="9.5" width="6" height="5" rx="1" /><rect x="15.5" y="3.5" width="6" height="5" rx="1" /><rect x="15.5" y="15.5" width="6" height="5" rx="1" /><path d="M8.5 12H12m0-6v12m0-12h3.5M12 18h3.5" /></g></svg>
)
const iconeTrofeu = (
  <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-dourado-texto"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 13v4M8.5 20h7M10 17h4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
)

/** Início (IN-01..05). */
export function Dashboard() {
  const { data: usuario } = useUsuarioAtual()
  const { data: pombos, isLoading, isError, error, refetch } = usePombos({ usuario_id: usuario!.id })
  const recentes = useResultadosRecentes()

  const total = pombos?.length
  const reprodutores = pombos?.filter((p) => p.status === 'REPRODUTOR').length
  const incompletos = pombos?.filter((p) => !p.pai_id || !p.mae_id).length
  const ultimos = [...(pombos ?? [])].sort((a, b) => b.id - a.id).slice(0, 5)
  const primeiroNome = usuario?.nome.split(' ')[0] ?? ''
  const valor = (n: number | undefined) => (isLoading ? '…' : (n ?? '—'))

  return (
    <div>
      <section
        aria-labelledby="titulo-inicio"
        className="relative -mb-16 min-h-[250px] overflow-hidden rounded-2xl bg-[radial-gradient(120%_140%_at_60%_10%,#2b4b8a_0%,var(--color-marinho)_55%)] px-5 pb-24 pt-6 text-white sm:px-8 sm:pt-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-[center_18%] opacity-25 sm:left-auto sm:w-[46%] sm:opacity-95 sm:[mask-image:linear-gradient(90deg,transparent_0%,#000_45%)]"
          style={{ backgroundImage: `url(${fotoPombo})` }}
        />
        <div className="relative max-w-xl">
          <h1 id="titulo-inicio" className="text-[26px] font-bold sm:text-[28px]">
            {saudacao()}, {primeiroNome}!
          </h1>
          <p className="mb-4 mt-1 text-[#c7d2e6]">Seu plantel sempre à mão. Busque pela anilha ou cadastre um novo pombo.</p>
          <BuscaGlobal escura={false} grande />
        </div>
      </section>

      <div className="relative mb-5 grid grid-cols-3 gap-2 px-2.5 sm:gap-3.5 sm:px-4">
        <Numero icone={<LogoPomba className="h-6 w-7" />} valor={valor(total)} rotulo="Pombos" para="/pombos" />
        <Numero icone={iconeCoroa} valor={valor(reprodutores)} rotulo="Reprodutores" para="/reprodutores" />
        <Numero icone={iconeArvore} valor={valor(incompletos)} rotulo="Pedigree incompleto" para="/pombos?incompleto=1" />
      </div>

      {isError && <FalhaAoCarregar erro={error} oQue="o seu plantel" onTentar={refetch} />}

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <section aria-labelledby="titulo-ultimos" className="overflow-hidden rounded-[10px] border border-borda-suave bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 pb-1 pt-4">
            <h2 id="titulo-ultimos" className="text-[17px] font-semibold text-marinho">
              Últimos cadastrados
            </h2>
            <Link to="/pombos" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-link">
              Ver todos →
            </Link>
          </div>
          {isLoading ? (
            <div className="px-5"><Carregando linhas={4} /></div>
          ) : ultimos.length === 0 ? (
            <p className="px-5 pb-5 text-slate-600">Nenhum pombo cadastrado ainda.</p>
          ) : (
            <ul>
              {ultimos.map((p) => (
                <li key={p.id} className="border-t border-borda-suave">
                  <Link to={`/pombos/${p.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 px-5 py-3 hover:bg-fundo sm:grid-cols-[9rem_1fr_auto]">
                    <b className="font-semibold text-link tabular-nums">{p.anilha}</b>
                    <span className="col-start-1 row-start-2 text-sm text-slate-600 sm:col-start-auto sm:row-start-auto">
                      <SexoRotulo sexo={p.sexo} /> · {p.cor || 'cor não informada'}
                    </span>
                    <span className="col-start-2 row-span-2 row-start-1 sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                      <SeloSituacao situacao={p.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-5">
          <section className="flex flex-col items-center gap-1.5 rounded-[10px] bg-[linear-gradient(160deg,var(--color-marinho)_0%,var(--color-marinho-3)_100%)] px-5 py-6 text-center text-white">
            <span aria-hidden className="mb-1 grid h-[52px] w-[52px] place-items-center rounded-full border-2 border-dourado text-2xl text-dourado">
              +
            </span>
            <h2 className="text-[17px] font-semibold">Cadastrar novo pombo</h2>
            <p className="mb-2.5 text-[13px] text-[#c7d2e6]">Pai e mãe podem ser ligados agora ou depois, direto na árvore.</p>
            <Link to="/pombos/novo" className={classeBotao('primaria')}>
              Cadastrar agora →
            </Link>
          </section>

          <section aria-labelledby="titulo-resultados" className="rounded-[10px] border border-borda-suave bg-white p-5 shadow-sm">
            <h2 id="titulo-resultados" className="mb-1 text-[17px] font-semibold text-marinho">
              Últimos resultados
            </h2>
            {recentes.isLoading ? (
              <Carregando linhas={3} />
            ) : recentes.isError ? (
              <FalhaAoCarregar erro={recentes.error} oQue="os resultados" onTentar={recentes.refetch} />
            ) : recentes.data?.length === 0 ? (
              <p className="text-slate-600">Nenhum resultado registrado ainda. Registre na aba "Resultados" de cada pombo.</p>
            ) : (
              <ul>
                {recentes.data?.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 border-b border-borda-suave py-2.5 last:border-0">
                    <span className="flex items-center gap-2.5">
                      {iconeTrofeu}
                      <span>
                        <b className="block">{[r.colocacao, r.competicao].filter(Boolean).join(' — ')}</b>
                        <Link to={`/pombos/${r.pombo_id}`} className="inline-flex min-h-8 items-center text-sm text-slate-600 tabular-nums hover:text-link hover:underline">
                          {r.anilha}
                        </Link>
                      </span>
                    </span>
                    <span className="text-sm text-slate-500 tabular-nums">{r.ano ?? '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <CreditoFoto className="mt-6 text-center text-slate-500" />
    </div>
  )
}
