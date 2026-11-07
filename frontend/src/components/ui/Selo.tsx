import type { ReactNode } from 'react'

import type { Sexo, StatusPombo } from '../../api/types'
import { NOME_SEXO } from './classes'

export type TomSelo = 'neutro' | 'sucesso' | 'dourado' | 'aviso' | 'perigo' | 'apagado'

const TONS: Record<TomSelo, string> = {
  neutro: 'bg-slate-100 text-slate-700 border-slate-200',
  sucesso: 'bg-green-50 text-green-700 border-green-200',
  dourado: 'bg-dourado-claro text-dourado-texto border-[#f1d79a]',
  aviso: 'bg-amber-50 text-amber-800 border-amber-300',
  perigo: 'bg-red-50 text-red-700 border-red-200',
  apagado: 'bg-slate-100 text-slate-500 border-transparent line-through',
}

export function Selo({ tom = 'neutro', children, title }: { tom?: TomSelo; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-px text-xs font-semibold ${TONS[tom]}`}
    >
      {children}
    </span>
  )
}

const SITUACAO: Record<StatusPombo, { rotulo: string; tom: TomSelo }> = {
  ATIVO: { rotulo: 'Ativo', tom: 'sucesso' },
  REPRODUTOR: { rotulo: 'Reprodutor', tom: 'dourado' },
  VENDIDO: { rotulo: 'Vendido', tom: 'aviso' },
  FALECIDO: { rotulo: 'Falecido', tom: 'apagado' },
}

/** Situação do pombo como selo legível (UX-05): nunca o código cru "ATIVO". */
export function SeloSituacao({ situacao }: { situacao: StatusPombo }) {
  const { rotulo, tom } = SITUACAO[situacao]
  return <Selo tom={tom}>{rotulo}</Selo>
}

const SIMBOLO: Record<Sexo, string> = { M: '♂', F: '♀', DESCONHECIDO: '?' }
const COR: Record<Sexo, string> = { M: 'text-macho', F: 'text-femea', DESCONHECIDO: 'text-slate-400' }

/** ♂ Macho / ♀ Fêmea: o símbolo é decorativo, o texto é que informa (não depender só de cor). */
export function SexoRotulo({ sexo, soSimbolo = false }: { sexo: Sexo; soSimbolo?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={soSimbolo ? NOME_SEXO[sexo] : undefined}>
      <b aria-hidden className={`text-[17px] leading-none ${COR[sexo]}`}>
        {SIMBOLO[sexo]}
      </b>
      {soSimbolo ? <span className="sr-only">{NOME_SEXO[sexo]}</span> : NOME_SEXO[sexo]}
    </span>
  )
}
