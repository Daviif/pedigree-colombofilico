import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { ArvoreNo } from '../../api/types'
import { NOME_SEXO } from '../ui'
import { alturasDasPosicoes, montarColunas, noNoCaminho, type Papel, type Posicao, rotuloParentesco } from './montagem'

const SIMBOLO = { M: '♂', F: '♀', DESCONHECIDO: '?' } as const

type Props = {
  raiz: ArvoreNo
  geracoes: number
  podeEditar: boolean
  aoAdicionar: (papel: Papel, filho: { id: number; anilha: string }) => void
}

function CaixaPombo({ no, papeis, compacta }: { no: ArvoreNo; papeis: Papel[]; compacta?: boolean }) {
  const raiz = papeis.length === 0
  const sexo = no.sexo ?? 'DESCONHECIDO'
  const provas = no.resultados.length
  const borda = sexo === 'M' ? 'before:bg-macho' : sexo === 'F' ? 'before:bg-femea' : 'before:bg-slate-400'
  const classe = [
    'relative block w-full overflow-hidden rounded-[7px] border bg-white text-left shadow-sm',
    "before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
    borda,
    raiz ? 'min-h-24 border-2 border-marinho px-3.5 py-2.5 shadow-[0_0_0_4px_var(--color-dourado-claro)]' : 'border-borda px-3 py-1.5 hover:border-marinho-3 hover:shadow-[0_0_0_3px_#dbe4f3]',
    compacta ? 'h-[33px] py-1' : raiz ? '' : 'h-[70px]',
    no.duplicado ? 'border-amber-300 bg-amber-50' : '',
  ].join(' ')
  const conteudo = (
    <>
      {!compacta && (
        <span className="flex items-start justify-between gap-1">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{rotuloParentesco(papeis)}</span>
          {no.duplicado && <span className="text-[10.5px] font-bold text-amber-800">⚠ repetido</span>}
        </span>
      )}
      <span className={`flex items-center gap-1.5 font-bold text-marinho tabular-nums ${raiz ? 'text-[17px]' : 'text-[13.5px]'}`}>
        <span aria-hidden className={sexo === 'M' ? 'text-macho' : sexo === 'F' ? 'text-femea' : 'text-slate-400'}>
          {SIMBOLO[sexo]}
        </span>
        {no.anilha}
        {compacta && no.duplicado && <span className="ml-auto text-[10.5px] text-amber-800">⚠</span>}
      </span>
      {!compacta && (
        <span className="block truncate text-xs text-slate-600">
          {NOME_SEXO[sexo]} · {no.cor || '—'}
          {provas > 0 && ` · 🏆 ${provas}`}
        </span>
      )}
      {no.alerta_sexo && !compacta && <span className="block text-[11px] font-semibold text-red-700">⚠ sexo não confere com o papel</span>}
    </>
  )
  const rotuloAcessivel = `${rotuloParentesco(papeis)}: ${no.anilha}, ${NOME_SEXO[sexo]}${no.duplicado ? ', repetido na árvore' : ''}${no.alerta_sexo ? ', sexo não confere com o papel' : ''}`
  if (raiz || !no.id) {
    return (
      <div className={classe} aria-label={rotuloAcessivel}>
        {conteudo}
      </div>
    )
  }
  return (
    <Link to={`/pombos/${no.id}`} className={classe} aria-label={rotuloAcessivel}>
      {conteudo}
    </Link>
  )
}

function Vaga({ pos, podeEditar, compacta, aoAdicionar }: { pos: Extract<Posicao, { tipo: 'vaga' }>; podeEditar: boolean; compacta?: boolean; aoAdicionar: Props['aoAdicionar'] }) {
  const altura = compacta ? 'h-[33px]' : 'h-[70px]'
  if (!podeEditar || !pos.filho.id) {
    return <div className={`${altura} grid place-items-center rounded-[7px] border border-dashed border-borda bg-white text-sm text-slate-500`}>Desconhecido</div>
  }
  const pai = pos.papel === 'pai'
  return (
    <button
      type="button"
      onClick={() => aoAdicionar(pos.papel, { id: pos.filho.id!, anilha: pos.filho.anilha ?? '' })}
      aria-label={`Adicionar ${pai ? 'pai' : 'mãe'} de ${pos.filho.anilha}`}
      className={`${altura} flex w-full items-center justify-center gap-1.5 rounded-[7px] border-[1.5px] border-dashed border-[#b7c2d4] bg-[#f8fafd] font-semibold text-marinho-3 hover:border-dourado-2 hover:bg-dourado-claro hover:text-dourado-texto`}
    >
      <span aria-hidden>+</span>
      <span aria-hidden className={pai ? 'text-macho' : 'text-femea'}>{pai ? '♂' : '♀'}</span>
      {pai ? 'Pai' : 'Mãe'}
    </button>
  )
}

/** Árvore genealógica (AR-01..06). Desktop: colunas por geração. Celular: uma geração por vez. */
export function ArvoreGenealogica({ raiz, geracoes, podeEditar, aoAdicionar }: Props) {
  const colunas = montarColunas(raiz, geracoes)
  const alturas = alturasDasPosicoes(colunas)
  const [caminho, setCaminho] = useState<Papel[]>([])
  const foco = noNoCaminho(raiz, caminho) ?? raiz

  return (
    <>
      {/* Desktop */}
      <div
        data-vista="colunas"
        className={`hidden overflow-x-auto pb-2 sm:grid ${geracoes > 4 ? 'gap-x-4' : 'gap-x-6'}`}
        style={{ gridTemplateColumns: `repeat(${colunas.length}, minmax(${geracoes > 4 ? 140 : 165}px, 1fr))` }}
      >
        {colunas.map((coluna, n) => (
          <div key={n} className="flex min-w-0 flex-col">
            {coluna.map((pos, i) =>
              pos.tipo === 'vazio' ? null : (
                <div key={i} className="flex flex-col justify-center" style={{ height: alturas[n][i] }}>
                  {pos.tipo === 'no' ? (
                    <CaixaPombo no={pos.no} papeis={pos.papeis} compacta={n >= 4} />
                  ) : (
                    <Vaga pos={pos} podeEditar={podeEditar} compacta={n >= 4} aoAdicionar={aoAdicionar} />
                  )}
                </div>
              ),
            )}
          </div>
        ))}
      </div>

      {/* Celular */}
      <div data-vista="celular" className="sm:hidden">
        <nav aria-label="Caminho na árvore" className="mb-3 flex flex-wrap items-center gap-1 text-[13px] text-slate-500">
          {caminho.length === 0 ? (
            <span className="font-semibold text-slate-900">Pombo principal</span>
          ) : (
            <>
              {[[], ...caminho.map((_, i) => caminho.slice(0, i + 1))].map((parcial, i) =>
                i < caminho.length ? (
                  <span key={i} className="flex items-center gap-1">
                    <button type="button" onClick={() => setCaminho(parcial)} className="min-h-11 px-1 font-semibold text-link">
                      {i === 0 ? 'Principal' : rotuloParentesco(parcial)}
                    </button>
                    <span aria-hidden>›</span>
                  </span>
                ) : (
                  <span key={i} className="font-semibold text-slate-900">
                    {rotuloParentesco(parcial)}
                  </span>
                ),
              )}
            </>
          )}
        </nav>
        <CaixaPombo no={foco} papeis={caminho} />
        <p className="my-2.5 flex items-center gap-2 text-xs text-slate-500 before:flex-1 before:border-t before:border-dashed before:border-borda after:flex-1 after:border-t after:border-dashed after:border-borda">
          pais — toque para subir
        </p>
        <div className="flex flex-col gap-2.5">
          {(['pai', 'mae'] as Papel[]).map((papel) => {
            const genitor = foco[papel]
            const papeis = [...caminho, papel]
            return genitor ? (
              <button
                key={papel}
                type="button"
                onClick={() => setCaminho(papeis)}
                className="text-left"
                aria-label={`Subir para ${rotuloParentesco(papeis)}: ${genitor.anilha}`}
              >
                <span className="pointer-events-none block">
                  <CaixaPomboEstatica no={genitor} papeis={papeis} />
                </span>
              </button>
            ) : (
              <Vaga key={papel} pos={{ tipo: 'vaga', papel, filho: foco, papeis }} podeEditar={podeEditar} aoAdicionar={aoAdicionar} />
            )
          })}
        </div>
      </div>
    </>
  )
}

/** No celular, tocar no pai/mãe sobe uma geração (em vez de abrir a página dele). */
function CaixaPomboEstatica({ no, papeis }: { no: ArvoreNo; papeis: Papel[] }) {
  return <CaixaPombo no={{ ...no, id: null }} papeis={papeis} />
}
