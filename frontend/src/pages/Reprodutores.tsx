import { Link } from 'react-router-dom'

import { usePombos, useUsuarioAtual } from '../api/hooks'
import type { Pombo, Sexo } from '../api/types'
import { FalhaAoCarregar } from '../components/FalhaAoCarregar'
import { Carregando, Migalhas, Vazio } from '../components/ui'
import { ordemAnilha } from '../formatadores'

const GRUPOS: { sexo: Sexo; titulo: string; simbolo: string; cor: string; vazio: string }[] = [
  { sexo: 'M', titulo: 'Machos', simbolo: '♂', cor: 'bg-blue-100 text-macho', vazio: 'Nenhum reprodutor macho.' },
  { sexo: 'F', titulo: 'Fêmeas', simbolo: '♀', cor: 'bg-pink-100 text-femea', vazio: 'Nenhum reprodutor fêmea.' },
  { sexo: 'DESCONHECIDO', titulo: 'Sexo não informado', simbolo: '?', cor: 'bg-slate-100 text-slate-500', vazio: '' },
]

/** RP-01..03: reprodutores do próprio plantel, por sexo, com o número de filhos. */
export function Reprodutores() {
  const { data: usuario } = useUsuarioAtual()
  // O plantel inteiro (sem paginação): os filhos de cada reprodutor saem daqui.
  const { data: plantel, isLoading, isError, error, refetch } = usePombos({ usuario_id: usuario!.id })

  const filhos = new Map<number, number>()
  for (const p of plantel ?? [])
    for (const g of [p.pai_id, p.mae_id]) if (g) filhos.set(g, (filhos.get(g) ?? 0) + 1)
  const reprodutores = (plantel ?? []).filter((p) => p.status === 'REPRODUTOR').sort((a, b) => ordemAnilha.compare(a.anilha, b.anilha))

  return (
    <div className="space-y-4">
      <div>
        <Migalhas itens={[{ rotulo: 'Início', para: '/' }, { rotulo: 'Reprodutores' }]} />
        <h1 className="text-[26px] font-bold text-marinho">Reprodutores</h1>
        <p className="text-sm text-slate-600">Pombos com a situação "Reprodutor". Clique para ver o pedigree.</p>
      </div>

      {isError ? (
        <FalhaAoCarregar erro={error} oQue="os reprodutores" onTentar={refetch} />
      ) : isLoading ? (
        <Carregando linhas={4} rotulo="Carregando os reprodutores…" />
      ) : reprodutores.length === 0 ? (
        <section className="rounded-[10px] border border-borda-suave bg-white shadow-sm">
          <Vazio titulo="Nenhum reprodutor ainda">
            Para marcar um pombo como reprodutor, abra o pombo e use <b>Editar → Situação: Reprodutor</b>.
          </Vazio>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          {GRUPOS.map((g) => {
            const lista = reprodutores.filter((p) => p.sexo === g.sexo)
            if (g.sexo === 'DESCONHECIDO' && lista.length === 0) return null
            return <Grupo key={g.sexo} grupo={g} lista={lista} filhos={filhos} />
          })}
        </div>
      )}
    </div>
  )
}

function Grupo({ grupo, lista, filhos }: { grupo: (typeof GRUPOS)[number]; lista: Pombo[]; filhos: Map<number, number> }) {
  const id = `reprodutores-${grupo.sexo}`
  return (
    <section aria-labelledby={id} className="rounded-[10px] border border-borda-suave bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden className={`grid h-[34px] w-[34px] place-items-center rounded-full text-[19px] font-bold ${grupo.cor}`}>
          {grupo.simbolo}
        </span>
        <h2 id={id} className="text-[17px] font-semibold text-marinho">
          {grupo.titulo}
        </h2>
        <span className="rounded-full bg-[#eef2f7] px-2.5 py-0.5 text-xs text-slate-600" aria-label={`${lista.length} reprodutores`}>
          {lista.length}
        </span>
      </div>
      {lista.length === 0 ? (
        <p className="py-2 text-slate-600">{grupo.vazio}</p>
      ) : (
        <ul className="divide-y divide-borda-suave">
          {lista.map((p) => {
            const n = filhos.get(p.id) ?? 0
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link to={`/pombos/${p.id}`} className="font-semibold text-link tabular-nums hover:underline">
                    {p.anilha}
                  </Link>
                  <div className="truncate text-[13px] text-slate-600">
                    {p.cor || '—'} · {p.proprietario?.nome ?? 'sem proprietário'}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-[#eef2f7] px-2.5 py-0.5 text-xs text-slate-600">
                  {n} {n === 1 ? 'filho' : 'filhos'}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
